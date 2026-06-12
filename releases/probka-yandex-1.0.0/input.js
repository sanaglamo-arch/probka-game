(function () {
  function createController(deps) {
    const clamp = deps.clamp || ((value, min, max) => Math.max(min, Math.min(max, value)));

    function pointerToCell(event) {
      const rect = deps.getCanvas().getBoundingClientRect();
      const board = deps.getBoardMetrics();
      const boardPadX = board.boardPadX ?? board.boardPad;
      const boardPadY = board.boardPadY ?? board.boardPad;
      return {
        x: (event.clientX - rect.left - boardPadX) / board.cellSize,
        y: (event.clientY - rect.top - boardPadY) / board.cellSize
      };
    }

    function onPointerDown(event) {
      if (event.cancelable) event.preventDefault();
      if (!deps.getLevel() || deps.isAnimating()) return;
      deps.ensureAudio();
      const cell = pointerToCell(event);
      const vehicle = deps.vehicleAtCell(cell.x, cell.y);
      if (!vehicle) return;
      if (!deps.isTutorialMoveAllowed(vehicle)) return;
      if (!deps.isTutorialActive()) deps.clearHint();
      deps.setSelected({
        vehicleId: vehicle.id,
        startPointer: { x: event.clientX, y: event.clientY },
        original: { x: vehicle.x, y: vehicle.y },
        previewDelta: 0,
        commitDelta: 0,
        rawDelta: 0,
        intentSign: 0,
        range: deps.getAllowedRange(vehicle)
      });
      try {
        deps.getCanvas().setPointerCapture(event.pointerId);
      } catch {
        // Synthetic events and a few embedded browsers do not always allow capture.
      }
      deps.draw();
    }

    function onPointerMove(event) {
      if (event.cancelable) event.preventDefault();
      const selected = deps.getSelected();
      if (!selected || deps.isAnimating()) return;
      const vehicle = deps.getVehicles().find((item) => item.id === selected.vehicleId);
      if (!vehicle) return;

      const board = deps.getBoardMetrics();
      const rawDelta =
        vehicle.axis === "horizontal"
          ? (event.clientX - selected.startPointer.x) / board.cellSize
          : (event.clientY - selected.startPointer.y) / board.cellSize;
      const clamped = clamp(rawDelta, selected.range.min, selected.range.max);
      const rubber =
        rawDelta > selected.range.max
          ? selected.range.max + Math.min(0.16, (rawDelta - selected.range.max) * 0.12)
          : rawDelta < selected.range.min
            ? selected.range.min - Math.min(0.16, (selected.range.min - rawDelta) * 0.12)
            : clamped;

      selected.rawDelta = rawDelta;
      selected.intentSign = Math.sign(rawDelta);
      selected.previewDelta = rubber;
      selected.commitDelta = clamp(Math.round(clamped), selected.range.min, selected.range.max);
      deps.setSelected(selected);
      deps.draw();
    }

    function onPointerUp(event) {
      if (event.cancelable) event.preventDefault();
      const selected = deps.getSelected();
      if (!selected) return;
      const vehicle = deps.getVehicles().find((item) => item.id === selected.vehicleId);
      deps.setSelected(null);
      try {
        deps.getCanvas().releasePointerCapture(event.pointerId);
      } catch {
        // Some browsers release the pointer automatically.
      }

      if (!vehicle || deps.isAnimating()) return;
      if (selected.commitDelta) {
        if (!deps.isTutorialMoveAllowed(vehicle, selected.commitDelta)) {
          deps.startBump(vehicle, selected.intentSign || Math.sign(selected.commitDelta));
          return;
        }
        deps.applyMove(vehicle, selected.commitDelta);
      } else if (Math.abs(selected.rawDelta) > 0.18) {
        deps.startBump(vehicle, selected.intentSign);
      } else {
        deps.draw();
      }
    }

    return {
      pointerToCell,
      onPointerDown,
      onPointerMove,
      onPointerUp
    };
  }

  window.PROBKA_INPUT = {
    createController
  };
})();
