(function () {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(from, to, progress) {
    return from + (to - from) * progress;
  }

  function easeOutCubic(progress) {
    return 1 - Math.pow(1 - progress, 3);
  }

  function roundedRect(context, x, y, width, height, radius) {
    const safeWidth = Math.max(0, width);
    const safeHeight = Math.max(0, height);
    if (!safeWidth || !safeHeight) return;
    const r = Math.max(0, Math.min(radius, safeWidth / 2, safeHeight / 2));
    context.beginPath();
    context.moveTo(x + r, y);
    context.arcTo(x + safeWidth, y, x + safeWidth, y + safeHeight, r);
    context.arcTo(x + safeWidth, y + safeHeight, x, y + safeHeight, r);
    context.arcTo(x, y + safeHeight, x, y, r);
    context.arcTo(x, y, x + safeWidth, y, r);
    context.closePath();
  }

  function hashStable(value) {
    let hash = 0;
    for (let i = 0; i < value.length; i += 1) hash = (hash * 31 + value.charCodeAt(i)) | 0;
    return hash;
  }

  function hexToRgb(hex) {
    const normalized = hex.replace("#", "");
    return {
      r: parseInt(normalized.slice(0, 2), 16),
      g: parseInt(normalized.slice(2, 4), 16),
      b: parseInt(normalized.slice(4, 6), 16)
    };
  }

  function rgbToHex({ r, g, b }) {
    return `#${[r, g, b].map((value) => clamp(Math.round(value), 0, 255).toString(16).padStart(2, "0")).join("")}`;
  }

  function lighten(hex, amount) {
    const rgb = hexToRgb(hex);
    return rgbToHex({
      r: rgb.r + (255 - rgb.r) * amount,
      g: rgb.g + (255 - rgb.g) * amount,
      b: rgb.b + (255 - rgb.b) * amount
    });
  }

  function darken(hex, amount) {
    const rgb = hexToRgb(hex);
    return rgbToHex({
      r: rgb.r * (1 - amount),
      g: rgb.g * (1 - amount),
      b: rgb.b * (1 - amount)
    });
  }

  const defaultYardPalette = {
    outer: ["#171c25", "#10151d", "#0b0f16"],
    curb: "#222b36",
    curbLine: "rgba(232, 189, 106, 0.72)",
    sideShadow: "#0a0d13",
    asphalt: ["#45505c", "#353f4a", "#252d37"],
    tile: "rgba(255,255,255,0.018)",
    slotLine: "rgba(232, 189, 106, 0.22)",
    gridLine: "rgba(255,255,255,0.075)",
    dashLine: "rgba(255,255,255,0.2)",
    border: "rgba(232, 189, 106, 0.62)",
    exitLane: "rgba(119, 215, 166, 0.1)",
    exitGlow: "119, 215, 166",
    exitDark: "#1c725c",
    exit: "#77d7a6",
    speck: "rgba(255,255,255,0.06)",
    cone: "#ff9f43",
    coneBase: "#7d3d00",
    bin: "#269763",
    binDark: "#155f45",
    gate: "#ef4056",
    gateDark: "#263140",
    snow: "#ccecff",
    win: "#19bf82",
    winCoin: "#ffc83d"
  };

  function getYardPalette(options = {}) {
    const themePalette = options.yardTheme && options.yardTheme.palette ? options.yardTheme.palette : {};
    return { ...defaultYardPalette, ...themePalette };
  }

  function makeGradient(ctx, x0, y0, x1, y1, colors) {
    const gradient = ctx.createLinearGradient(x0, y0, x1, y1);
    const safeColors = colors && colors.length ? colors : defaultYardPalette.outer;
    safeColors.forEach((color, index) => {
      gradient.addColorStop(safeColors.length === 1 ? 0 : index / (safeColors.length - 1), color);
    });
    return gradient;
  }

  function colorWithAlpha(color, alpha) {
    if (!color) return `rgba(255,255,255,${alpha})`;
    if (color.startsWith("#")) {
      const rgb = hexToRgb(color);
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
    }
    if (/^\d+\s*,/.test(color)) return `rgba(${color}, ${alpha})`;
    return color;
  }

  const skinSpriteStore = {
    src: "",
    ready: false,
    loading: false,
    error: "",
    sprites: [],
    byId: {},
    callbacks: []
  };

  const yardAssetStore = {
    src: "",
    ready: false,
    loading: false,
    error: "",
    images: {},
    callbacks: []
  };
  function loadSkinSprites(source, versionOrReady, onReady) {
    if (Array.isArray(source)) {
      loadIndividualSkinSprites(source, typeof versionOrReady === "string" ? versionOrReady : "", typeof versionOrReady === "function" ? versionOrReady : onReady);
      return;
    }
    const src = source;
    if (typeof versionOrReady === "function") onReady = versionOrReady;
    if (typeof onReady === "function") skinSpriteStore.callbacks.push(onReady);
    if (!src || typeof Image === "undefined" || typeof document === "undefined") return;
    if (skinSpriteStore.ready && skinSpriteStore.src === src) {
      flushSkinSpriteCallbacks();
      return;
    }
    if (skinSpriteStore.loading && skinSpriteStore.src === src) return;
    skinSpriteStore.src = src;
    skinSpriteStore.ready = false;
    skinSpriteStore.loading = true;
    skinSpriteStore.error = "";
    const image = new Image();
    image.onload = () => {
      try {
        skinSpriteStore.sprites = extractSkinSprites(image, 6, 3);
        skinSpriteStore.byId = {};
        skinSpriteStore.ready = true;
      } catch (error) {
        skinSpriteStore.error = error && error.message ? error.message : "skin sprite extraction failed";
        skinSpriteStore.sprites = [];
      }
      skinSpriteStore.loading = false;
      flushSkinSpriteCallbacks();
    };
    image.onerror = () => {
      skinSpriteStore.error = "skin sprite sheet failed to load";
      skinSpriteStore.loading = false;
      flushSkinSpriteCallbacks();
    };
    image.src = src;
  }

  function loadIndividualSkinSprites(skins, version, onReady) {
    if (typeof onReady === "function") skinSpriteStore.callbacks.push(onReady);
    if (!skins || !skins.length || typeof Image === "undefined") return;
    const signature = skins.map((skin) => skin.sprite && skin.sprite.src ? skin.sprite.src : "").join("|") + `?${version || ""}`;
    if (skinSpriteStore.ready && skinSpriteStore.src === signature) {
      flushSkinSpriteCallbacks();
      return;
    }
    if (skinSpriteStore.loading && skinSpriteStore.src === signature) return;

    skinSpriteStore.src = signature;
    skinSpriteStore.ready = false;
    skinSpriteStore.loading = true;
    skinSpriteStore.error = "";
    skinSpriteStore.sprites = [];
    skinSpriteStore.byId = {};

    const spriteSkins = skins.filter((skin) => skin && skin.id && skin.sprite && skin.sprite.src);
    let remaining = spriteSkins.length;
    if (!remaining) {
      skinSpriteStore.ready = true;
      skinSpriteStore.loading = false;
      flushSkinSpriteCallbacks();
      return;
    }

    function finishOne() {
      remaining -= 1;
      if (remaining > 0) return;
      skinSpriteStore.ready = true;
      skinSpriteStore.loading = false;
      flushSkinSpriteCallbacks();
    }

    spriteSkins.forEach((skin) => {
      const image = new Image();
      image.onload = () => {
        skinSpriteStore.byId[skin.id] = trimLoadedSprite(image, 5);
        finishOne();
      };
      image.onerror = () => {
        skinSpriteStore.error = skinSpriteStore.error || `skin sprite failed: ${skin.id}`;
        finishOne();
      };
      image.src = `${skin.sprite.src}${skin.sprite.src.includes("?") ? "&" : "?"}v=${encodeURIComponent(version || "1")}`;
    });
  }

  function loadYardAssets(yards, version = "", onReady) {
    if (typeof onReady === "function") yardAssetStore.callbacks.push(onReady);
    if (!yards || !yards.length || typeof Image === "undefined") return;
    const sources = collectYardAssetSources(yards);
    const signature = sources.join("|") + `?${version || ""}`;
    if (yardAssetStore.ready && yardAssetStore.src === signature) {
      flushYardAssetCallbacks();
      return;
    }
    if (yardAssetStore.loading && yardAssetStore.src === signature) return;

    yardAssetStore.src = signature;
    yardAssetStore.ready = false;
    yardAssetStore.loading = true;
    yardAssetStore.error = "";
    yardAssetStore.images = {};

    let remaining = sources.length;
    if (!remaining) {
      yardAssetStore.ready = true;
      yardAssetStore.loading = false;
      flushYardAssetCallbacks();
      return;
    }

    function finishOne() {
      remaining -= 1;
      if (remaining > 0) return;
      yardAssetStore.ready = true;
      yardAssetStore.loading = false;
      flushYardAssetCallbacks();
    }

    sources.forEach((src) => {
      const image = new Image();
      image.onload = () => {
        yardAssetStore.images[src] = image;
        finishOne();
      };
      image.onerror = () => {
        yardAssetStore.error = yardAssetStore.error || `yard asset failed: ${src}`;
        finishOne();
      };
      image.src = `${src}${src.includes("?") ? "&" : "?"}v=${encodeURIComponent(version || "1")}`;
    });
  }

  function collectYardAssetSources(yards) {
    const sources = [];
    const seen = new Set();
    function visit(value) {
      if (!value) return;
      if (typeof value === "string") {
        if (!/\.(png|webp|jpe?g)(\?|$)/i.test(value) || seen.has(value)) return;
        seen.add(value);
        sources.push(value);
        return;
      }
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (typeof value === "object") Object.values(value).forEach(visit);
    }
    yards.forEach((yard) => visit(yard.assets));
    return sources;
  }

  function flushYardAssetCallbacks() {
    const callbacks = yardAssetStore.callbacks.splice(0);
    callbacks.forEach((callback) => callback(yardAssetStore));
  }

  function getLoadedYardAsset(src) {
    return src && yardAssetStore.images[src] ? yardAssetStore.images[src] : null;
  }

  function getImageSize(image) {
    return {
      width: image.naturalWidth || image.videoWidth || image.width || 1,
      height: image.naturalHeight || image.videoHeight || image.height || 1
    };
  }

  function drawImageCover(ctx, image, x, y, width, height) {
    const source = getImageSize(image);
    const scale = Math.max(width / source.width, height / source.height);
    const sw = width / scale;
    const sh = height / scale;
    const sx = (source.width - sw) / 2;
    const sy = (source.height - sh) / 2;
    ctx.drawImage(image, sx, sy, sw, sh, x, y, width, height);
  }

  function drawImageContain(ctx, image, x, y, width, height) {
    const source = getImageSize(image);
    const scale = Math.min(width / source.width, height / source.height);
    const dw = source.width * scale;
    const dh = source.height * scale;
    ctx.drawImage(image, x + (width - dw) / 2, y + (height - dh) / 2, dw, dh);
  }

  function trimLoadedSprite(image, extraMargin = 0) {
    if (typeof document === "undefined") return image;
    const width = image.naturalWidth || image.width;
    const height = image.naturalHeight || image.height;
    if (!width || !height) return image;

    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = width;
    sourceCanvas.height = height;
    const sourceCtx = sourceCanvas.getContext("2d");
    sourceCtx.drawImage(image, 0, 0, width, height);
    const imageData = sourceCtx.getImageData(0, 0, width, height);
    const bounds = getAlphaBounds(imageData, width, height);
    if (!bounds) return image;

    const x = Math.max(0, bounds.x - extraMargin);
    const y = Math.max(0, bounds.y - extraMargin);
    const right = Math.min(width, bounds.x + bounds.width + extraMargin);
    const bottom = Math.min(height, bounds.y + bounds.height + extraMargin);
    const trimmedWidth = Math.max(1, right - x);
    const trimmedHeight = Math.max(1, bottom - y);
    const trimmed = document.createElement("canvas");
    trimmed.width = trimmedWidth;
    trimmed.height = trimmedHeight;
    trimmed.getContext("2d").drawImage(sourceCanvas, x, y, trimmedWidth, trimmedHeight, 0, 0, trimmedWidth, trimmedHeight);
    return trimmed;
  }

  function flushSkinSpriteCallbacks() {
    const callbacks = skinSpriteStore.callbacks.splice(0);
    callbacks.forEach((callback) => {
      try {
        callback({ ready: skinSpriteStore.ready, error: skinSpriteStore.error });
      } catch (error) {
        setTimeout(() => {
          throw error;
        }, 0);
      }
    });
  }

  function extractSkinSprites(image, columns, rows) {
    const cellWidth = Math.floor(image.width / columns);
    const cellHeight = Math.floor(image.height / rows);
    const sprites = [];
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const canvas = document.createElement("canvas");
        canvas.width = cellWidth;
        canvas.height = cellHeight;
        const spriteCtx = canvas.getContext("2d");
        spriteCtx.drawImage(image, column * cellWidth, row * cellHeight, cellWidth, cellHeight, 0, 0, cellWidth, cellHeight);
        const imageData = spriteCtx.getImageData(0, 0, cellWidth, cellHeight);
        eraseNeutralBackground(imageData, cellWidth, cellHeight);
        const bounds = getAlphaBounds(imageData, cellWidth, cellHeight);
        sprites.push(bounds ? trimImageData(imageData, bounds) : canvas);
      }
    }
    return sprites;
  }

  function getBackgroundSample(data, width, height) {
    const samples = [];
    const positions = [
      [2, 2],
      [width - 3, 2],
      [2, height - 3],
      [width - 3, height - 3],
      [Math.floor(width / 2), 2],
      [Math.floor(width / 2), height - 3]
    ];
    positions.forEach(([x, y]) => {
      const index = (y * width + x) * 4;
      samples.push([data[index], data[index + 1], data[index + 2]]);
    });
    return samples.reduce(
      (sum, sample) => ({ r: sum.r + sample[0] / samples.length, g: sum.g + sample[1] / samples.length, b: sum.b + sample[2] / samples.length }),
      { r: 0, g: 0, b: 0 }
    );
  }

  function isNeutralBackgroundPixel(data, index, background) {
    const r = data[index];
    const g = data[index + 1];
    const b = data[index + 2];
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const distance = Math.sqrt((r - background.r) ** 2 + (g - background.g) ** 2 + (b - background.b) ** 2);
    return max < 96 && max - min < 50 && distance < 82;
  }

  function eraseNeutralBackground(imageData, width, height) {
    const data = imageData.data;
    const background = getBackgroundSample(data, width, height);
    const visited = new Uint8Array(width * height);
    const queue = [];

    function enqueue(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height) return;
      const pixelIndex = y * width + x;
      if (visited[pixelIndex]) return;
      const dataIndex = pixelIndex * 4;
      if (!isNeutralBackgroundPixel(data, dataIndex, background)) return;
      visited[pixelIndex] = 1;
      queue.push(pixelIndex);
    }

    for (let x = 0; x < width; x += 1) {
      enqueue(x, 0);
      enqueue(x, height - 1);
    }
    for (let y = 0; y < height; y += 1) {
      enqueue(0, y);
      enqueue(width - 1, y);
    }

    while (queue.length) {
      const pixelIndex = queue.pop();
      const dataIndex = pixelIndex * 4;
      data[dataIndex + 3] = 0;
      const x = pixelIndex % width;
      const y = Math.floor(pixelIndex / width);
      enqueue(x + 1, y);
      enqueue(x - 1, y);
      enqueue(x, y + 1);
      enqueue(x, y - 1);
    }
  }

  function getAlphaBounds(imageData, width, height) {
    const data = imageData.data;
    let minX = width;
    let minY = height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha <= 8) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return null;
    return {
      x: Math.max(0, minX - 3),
      y: Math.max(0, minY - 3),
      width: Math.min(width, maxX + 4) - Math.max(0, minX - 3),
      height: Math.min(height, maxY + 4) - Math.max(0, minY - 3)
    };
  }

  function trimImageData(imageData, bounds) {
    const canvas = document.createElement("canvas");
    canvas.width = bounds.width;
    canvas.height = bounds.height;
    const ctx = canvas.getContext("2d");
    const sourceCanvas = document.createElement("canvas");
    sourceCanvas.width = imageData.width;
    sourceCanvas.height = imageData.height;
    sourceCanvas.getContext("2d").putImageData(imageData, 0, 0);
    ctx.drawImage(sourceCanvas, bounds.x, bounds.y, bounds.width, bounds.height, 0, 0, bounds.width, bounds.height);
    return canvas;
  }

  function getSkinSprite(skin) {
    if (!skin || !skin.sprite) return null;
    if (skin.sprite.src) return skinSpriteStore.byId[skin.id] || null;
    return null;
  }

  function hasSkinSprite(skin) {
    return Boolean(getSkinSprite(skin));
  }

  function getSkinSpriteDrawRect(skin, x, y, width, height, axis, scaleBoost = 1) {
    const sprite = getSkinSprite(skin);
    if (!sprite || !sprite.width || !sprite.height) return null;
    if (axis === "horizontal") {
      const scale = Math.min(height / sprite.width, width / sprite.height) * scaleBoost;
      const drawWidth = sprite.height * scale;
      const drawHeight = sprite.width * scale;
      return {
        x: x + (width - drawWidth) / 2,
        y: y + (height - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight
      };
    }
    const scale = Math.min(width / sprite.width, height / sprite.height) * scaleBoost;
    const drawWidth = sprite.width * scale;
    const drawHeight = sprite.height * scale;
    return {
      x: x + (width - drawWidth) / 2,
      y: y + (height - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight
    };
  }

  function drawSpriteInBox(ctx, sprite, x, y, width, height, scaleBoost = 1) {
    if (!sprite || !sprite.width || !sprite.height) return false;
    const scale = Math.min(width / sprite.width, height / sprite.height) * scaleBoost;
    const drawWidth = sprite.width * scale;
    const drawHeight = sprite.height * scale;
    ctx.drawImage(sprite, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
    return true;
  }

  function drawSkinSprite(ctx, skin, x, y, width, height, axis) {
    const sprite = getSkinSprite(skin);
    if (!sprite) return false;
    ctx.save();
    if (axis === "horizontal") {
      ctx.translate(x + width / 2, y + height / 2);
      ctx.rotate(Math.PI / 2);
      drawSpriteInBox(ctx, sprite, -height / 2, -width / 2, height, width, skin.sprite.src ? 1 : 1.12);
    } else {
      drawSpriteInBox(ctx, sprite, x, y, width, height, skin.sprite.src ? 1 : 1.08);
    }
    ctx.restore();
    return true;
  }

  function renderSkinSpritePreview(canvas, skin) {
    if (!canvas || !canvas.getContext) return false;
    const ratio = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(120, Math.round((rect.width || 150) * ratio));
    const height = Math.max(76, Math.round((rect.height || 86) * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.scale(ratio, ratio);
    const cssWidth = width / ratio;
    const cssHeight = height / ratio;
    const background = ctx.createLinearGradient(0, 0, cssWidth, cssHeight);
    background.addColorStop(0, "rgba(37, 45, 60, 0.96)");
    background.addColorStop(1, "rgba(12, 16, 24, 0.96)");
    ctx.fillStyle = background;
    roundedRect(ctx, 0.5, 0.5, cssWidth - 1, cssHeight - 1, 12);
    ctx.fill();
    ctx.strokeStyle = "rgba(229, 237, 255, 0.12)";
    ctx.lineWidth = 1;
    roundedRect(ctx, 0.5, 0.5, cssWidth - 1, cssHeight - 1, 12);
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    roundedRect(ctx, 6, 6, cssWidth - 12, cssHeight - 12, 10);
    ctx.clip();
    ctx.strokeStyle = "rgba(232, 189, 106, 0.16)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 5; i += 1) {
      ctx.beginPath();
      ctx.moveTo(6, 6 + ((cssHeight - 12) / 5) * i);
      ctx.lineTo(cssWidth - 6, 6 + ((cssHeight - 12) / 5) * i);
      ctx.stroke();
    }
    ctx.restore();

    ctx.fillStyle = "rgba(0, 0, 0, 0.22)";
    roundedRect(ctx, cssWidth * 0.24, cssHeight * 0.73, cssWidth * 0.52, cssHeight * 0.1, 999);
    ctx.fill();

    const sprite = getSkinSprite(skin);
    if (sprite) {
      if (skin.sprite && skin.sprite.src) {
        const previewWidth = cssWidth * 0.82;
        const previewHeight = cssHeight * 0.56;
        ctx.save();
        ctx.translate(cssWidth / 2, cssHeight * 0.48);
        ctx.rotate(Math.PI / 2);
        drawSpriteInBox(ctx, sprite, -previewHeight / 2, -previewWidth / 2, previewHeight, previewWidth, 1);
        ctx.restore();
      } else {
        drawSpriteInBox(ctx, sprite, cssWidth * 0.2, cssHeight * 0.08, cssWidth * 0.6, cssHeight * 0.75, 1.08);
      }
    } else {
      drawFallbackSkinPreviewCar(ctx, skin, cssWidth, cssHeight);
    }
    ctx.restore();
    return Boolean(sprite);
  }

  function drawFallbackSkinPreviewCar(ctx, skin, width, height) {
    const carWidth = width * 0.56;
    const carHeight = height * 0.68;
    const x = (width - carWidth) / 2;
    const y = height * 0.1;
    const gradient = ctx.createLinearGradient(x, y, x + carWidth, y + carHeight);
    gradient.addColorStop(0, lighten(skin.color || "#ff5c68", 0.2));
    gradient.addColorStop(0.62, skin.color || "#ff5c68");
    gradient.addColorStop(1, darken(skin.color || "#ff5c68", 0.22));
    ctx.fillStyle = gradient;
    roundedRect(ctx, x, y, carWidth, carHeight, 14);
    ctx.fill();
    ctx.strokeStyle = skin.accent || "#fff2a8";
    ctx.lineWidth = 2;
    roundedRect(ctx, x + 6, y + 6, carWidth - 12, carHeight - 12, 10);
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.75)";
    roundedRect(ctx, x + carWidth * 0.2, y + carHeight * 0.15, carWidth * 0.3, carHeight * 0.16, 5);
    ctx.fill();
    roundedRect(ctx, x + carWidth * 0.52, y + carHeight * 0.58, carWidth * 0.28, carHeight * 0.16, 5);
    ctx.fill();
  }

  function getYardEnvironment(theme = {}) {
    return theme.environment || theme.boardStyle || "quiet";
  }

  function getYardObstacleSprite(theme = {}, kind = "bin") {
    const sprites = theme.assets && theme.assets.obstacles ? theme.assets.obstacles : null;
    if (!sprites) return null;
    const key = kind === "snow" ? "themeBlock" : kind;
    return getLoadedYardAsset(sprites[key] || sprites.themeBlock || sprites.bin);
  }

  function getYardTrafficSprite(theme = {}, vehicle = {}) {
    const sprites = theme.assets && theme.assets.traffic ? theme.assets.traffic : null;
    if (!sprites) return null;
    if (vehicle.length >= 4) return null;
    const lengthKey = vehicle.length === 3 ? "van3" : "car2";
    const axisKey = vehicle.axis === "vertical" ? "Vertical" : "Horizontal";
    return getLoadedYardAsset(sprites[`${lengthKey}${axisKey}`]);
  }

  function usesFullArtBoard(theme = {}, level = {}) {
    return Boolean(theme.fullArtBoard && theme.gridFrame && theme.assets && theme.assets.board && level.width === 6 && level.height === 6);
  }

  function hasYardTrafficSprite(theme = {}, vehicle = {}) {
    return Boolean(getYardTrafficSprite(theme, vehicle));
  }

  function drawYardTrafficSprite(ctx, options = {}) {
    const image = getYardTrafficSprite(options.yardTheme, options.vehicle);
    if (!image) return false;
    ctx.save();
    ctx.beginPath();
    ctx.rect(options.x, options.y, options.width, options.height);
    ctx.clip();
    ctx.drawImage(image, options.x, options.y, options.width, options.height);
    ctx.restore();
    return true;
  }

  function drawLampPool(ctx, x, y, radius, color, coreColor) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, coreColor || "rgba(255, 220, 150, 0.32)");
    gradient.addColorStop(0.48, color || "rgba(255, 184, 107, 0.12)");
    gradient.addColorStop(1, "rgba(255, 184, 107, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawYardFrameDetails(ctx, options) {
    const { theme, palette, width, height, boardPad, boardWidth, boardHeight, cellSize } = options;
    const env = getYardEnvironment(theme);
    ctx.save();

    if (env === "night") {
      drawLampPool(ctx, boardPad + cellSize * 0.5, boardPad - cellSize * 0.08, cellSize * 1.25, palette.lamp, palette.lampCore);
      drawLampPool(ctx, boardPad + boardWidth - cellSize * 0.35, boardPad + boardHeight + cellSize * 0.1, cellSize * 1.35, palette.lamp, palette.lampCore);
      ctx.fillStyle = "rgba(255, 212, 145, 0.7)";
      roundedRect(ctx, boardPad + cellSize * 0.25, boardPad - cellSize * 0.2, cellSize * 0.42, 3, 2);
      ctx.fill();
      roundedRect(ctx, boardPad + boardWidth - cellSize * 0.62, boardPad + boardHeight + cellSize * 0.18, cellSize * 0.42, 3, 2);
      ctx.fill();
    }

    if (env === "winter") {
      ctx.fillStyle = palette.snowEdge || "rgba(245, 252, 255, 0.78)";
      roundedRect(ctx, boardPad - 5, boardPad - cellSize * 0.32, boardWidth + 10, cellSize * 0.22, cellSize * 0.08);
      ctx.fill();
      roundedRect(ctx, boardPad - 5, boardPad + boardHeight + cellSize * 0.1, boardWidth + 10, cellSize * 0.22, cellSize * 0.08);
      ctx.fill();
      ctx.globalAlpha = 0.72;
      for (let i = 0; i < 12; i += 1) {
        const sx = boardPad + ((i * 43) % 100) / 100 * boardWidth;
        const sy = i % 2 ? boardPad - cellSize * 0.2 : boardPad + boardHeight + cellSize * 0.22;
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1.5, cellSize * (0.035 + (i % 3) * 0.006)), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    if (env === "underground") {
      const columnWidth = Math.max(6, cellSize * 0.16);
      const columnHeight = cellSize * 0.62;
      const columns = [
        [boardPad - columnWidth * 0.45, boardPad + cellSize * 0.7],
        [boardPad + boardWidth - columnWidth * 0.55, boardPad + cellSize * 2.2],
        [boardPad - columnWidth * 0.45, boardPad + boardHeight - cellSize * 1.35],
        [boardPad + boardWidth - columnWidth * 0.55, boardPad + boardHeight - cellSize * 0.92]
      ];
      columns.forEach(([x, y], index) => {
        ctx.fillStyle = palette.columnDark || "#2a2d34";
        roundedRect(ctx, x, y, columnWidth, columnHeight, 3);
        ctx.fill();
        ctx.save();
        ctx.beginPath();
        roundedRect(ctx, x, y, columnWidth, columnHeight, 3);
        ctx.clip();
        ctx.strokeStyle = palette.column || "#c9b45a";
        ctx.lineWidth = Math.max(2, columnWidth * 0.6);
        for (let i = -1; i < 4; i += 1) {
          ctx.beginPath();
          ctx.moveTo(x - columnWidth + i * columnWidth, y + columnHeight);
          ctx.lineTo(x + i * columnWidth, y);
          ctx.stroke();
        }
        ctx.restore();
        if (index < 2) {
          ctx.fillStyle = palette.lamp || "rgba(255, 238, 190, 0.16)";
          roundedRect(ctx, boardPad + boardWidth * (index ? 0.58 : 0.18), boardPad - cellSize * 0.23, boardWidth * 0.24, 3, 2);
          ctx.fill();
        }
      });
    }

    if (env === "rainy") {
      ctx.strokeStyle = "rgba(180, 220, 230, 0.13)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 12; i += 1) {
        const x = boardPad + ((i * 29) % 100) / 100 * boardWidth;
        const y = boardPad - cellSize * 0.32 + (i % 3) * 6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 7, y + 15);
        ctx.stroke();
      }
    }

    if (env === "holiday") {
      const lightColors = ["#ffd166", "#ff7a86", "#70d59c", "#82b6ff"];
      for (let i = 0; i < 14; i += 1) {
        ctx.fillStyle = lightColors[i % lightColors.length];
        ctx.shadowColor = lightColors[i % lightColors.length];
        ctx.shadowBlur = 5;
        ctx.beginPath();
        ctx.arc(boardPad + (i / 13) * boardWidth, boardPad - cellSize * 0.17 + (i % 2) * 3, 2.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (env === "aged") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.13)";
      roundedRect(ctx, boardPad - 3, boardPad + boardHeight + 4, boardWidth * 0.32, 3, 2);
      ctx.fill();
      roundedRect(ctx, boardPad + boardWidth * 0.62, boardPad - 9, boardWidth * 0.22, 3, 2);
      ctx.fill();
    }

    if (env === "forest_parking") {
      ctx.fillStyle = palette.moss || "rgba(67, 110, 51, 0.36)";
      roundedRect(ctx, boardPad - cellSize * 0.2, boardPad - cellSize * 0.26, boardWidth * 0.28, cellSize * 0.16, 999);
      ctx.fill();
      roundedRect(ctx, boardPad + boardWidth * 0.72, boardPad + boardHeight + cellSize * 0.12, boardWidth * 0.24, cellSize * 0.15, 999);
      ctx.fill();
      ctx.fillStyle = palette.leaf || "rgba(193, 119, 39, 0.72)";
      for (let i = 0; i < 13; i += 1) {
        const lx = boardPad + ((i * 37) % 100) / 100 * boardWidth;
        const ly = i % 2 ? boardPad - cellSize * 0.18 : boardPad + boardHeight + cellSize * 0.22;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(((i % 5) - 2) * 0.26);
        roundedRect(ctx, -cellSize * 0.035, -cellSize * 0.012, cellSize * 0.07, cellSize * 0.028, 3);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore();
  }

  function drawYardSurfaceDetails(ctx, options) {
    const { theme, palette, boardWidth, boardHeight, cellSize } = options;
    const env = getYardEnvironment(theme);
    ctx.save();

    if (env === "quiet") {
      ctx.fillStyle = "rgba(0, 0, 0, 0.12)";
      roundedRect(ctx, cellSize * 4.78, cellSize * 4.82, cellSize * 0.42, cellSize * 0.1, 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(cellSize * (4.82 + i * 0.11), cellSize * 4.83);
        ctx.lineTo(cellSize * (4.82 + i * 0.11), cellSize * 4.9);
        ctx.stroke();
      }
    }

    if (env === "night") {
      drawLampPool(ctx, cellSize * 0.7, cellSize * 0.5, cellSize * 1.6, palette.lamp, palette.lampCore);
      drawLampPool(ctx, boardWidth - cellSize * 0.7, boardHeight - cellSize * 0.45, cellSize * 1.5, palette.lamp, palette.lampCore);
    }

    if (env === "winter") {
      ctx.strokeStyle = palette.tireTrack || "rgba(42, 66, 82, 0.24)";
      ctx.lineWidth = Math.max(2, cellSize * 0.052);
      ctx.lineCap = "round";
      ctx.setLineDash([cellSize * 0.42, cellSize * 0.22]);
      [1.42, 3.18, 4.75].forEach((row, index) => {
        ctx.beginPath();
        ctx.moveTo(cellSize * 0.38, cellSize * row);
        ctx.bezierCurveTo(cellSize * 2.1, cellSize * (row + 0.12), cellSize * 3.7, cellSize * (row - 0.12), boardWidth - cellSize * 0.35, cellSize * (row + (index % 2 ? 0.06 : -0.04)));
        ctx.stroke();
      });
      ctx.setLineDash([]);
      ctx.fillStyle = "rgba(250, 253, 255, 0.5)";
      for (let i = 0; i < 16; i += 1) {
        ctx.beginPath();
        ctx.arc(((i * 41) % 100) / 100 * boardWidth, ((i * 67) % 100) / 100 * boardHeight, i % 3 === 0 ? 2.1 : 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (env === "underground") {
      ctx.fillStyle = "rgba(255, 238, 190, 0.08)";
      roundedRect(ctx, cellSize * 0.75, cellSize * 0.12, cellSize * 1.35, cellSize * 0.06, 2);
      ctx.fill();
      roundedRect(ctx, boardWidth - cellSize * 2.1, cellSize * 0.12, cellSize * 1.35, cellSize * 0.06, 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(225, 190, 85, 0.28)";
      ctx.lineWidth = Math.max(1, cellSize * 0.026);
      ctx.beginPath();
      ctx.moveTo(cellSize * 0.18, cellSize * 5.62);
      ctx.lineTo(boardWidth - cellSize * 0.18, cellSize * 5.62);
      ctx.stroke();
    }

    if (env === "rainy") {
      const puddles = [
        [1.1, 0.85, 0.56, 0.18],
        [4.35, 1.65, 0.72, 0.2],
        [2.6, 4.78, 0.82, 0.22],
        [5.1, 3.55, 0.48, 0.16]
      ];
      puddles.forEach(([x, y, w, h], index) => {
        ctx.fillStyle = index % 2 ? palette.puddleLight || "rgba(218,245,255,0.18)" : palette.puddle || "rgba(143,205,230,0.16)";
        ctx.beginPath();
        ctx.ellipse(cellSize * x, cellSize * y, cellSize * w, cellSize * h, -0.15, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.strokeStyle = "rgba(220, 245, 255, 0.12)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 13; i += 1) {
        const x = ((i * 31) % 100) / 100 * boardWidth;
        const y = ((i * 47) % 100) / 100 * boardHeight;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - cellSize * 0.12, y + cellSize * 0.25);
        ctx.stroke();
      }
    }

    if (env === "aged") {
      ctx.strokeStyle = "rgba(10, 12, 10, 0.28)";
      ctx.lineWidth = Math.max(1, cellSize * 0.024);
      const cracks = [
        [[0.8, 1.2], [1.35, 1.32], [1.48, 1.75], [2.1, 1.92]],
        [[4.6, 0.9], [4.18, 1.35], [4.45, 1.62], [4.05, 2.05]],
        [[2.7, 4.7], [3.15, 4.55], [3.58, 4.9], [4.1, 4.72]]
      ];
      cracks.forEach((points) => {
        ctx.beginPath();
        points.forEach(([x, y], index) => {
          if (index === 0) ctx.moveTo(cellSize * x, cellSize * y);
          else ctx.lineTo(cellSize * x, cellSize * y);
        });
        ctx.stroke();
      });
      ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
      for (let i = 0; i < 5; i += 1) {
        roundedRect(ctx, ((i * 47) % 100) / 100 * boardWidth, ((i * 31) % 100) / 100 * boardHeight, cellSize * 0.36, cellSize * 0.11, 7);
        ctx.fill();
      }
    }

    if (env === "forest_parking") {
      ctx.strokeStyle = "rgba(10, 14, 10, 0.25)";
      ctx.lineWidth = Math.max(1, cellSize * 0.026);
      const cracks = [
        [[0.55, 1.06], [0.98, 1.14], [1.28, 1.35], [1.72, 1.28]],
        [[4.4, 0.72], [4.07, 1.14], [4.34, 1.42], [4.0, 1.78]],
        [[2.28, 4.62], [2.7, 4.5], [3.1, 4.78], [3.58, 4.66]]
      ];
      cracks.forEach((points) => {
        ctx.beginPath();
        points.forEach(([x, y], index) => {
          if (index === 0) ctx.moveTo(cellSize * x, cellSize * y);
          else ctx.lineTo(cellSize * x, cellSize * y);
        });
        ctx.stroke();
      });
      ctx.fillStyle = palette.leaf || "rgba(193, 119, 39, 0.58)";
      for (let i = 0; i < 15; i += 1) {
        const lx = ((i * 41) % 100) / 100 * boardWidth;
        const ly = ((i * 67) % 100) / 100 * boardHeight;
        ctx.save();
        ctx.translate(lx, ly);
        ctx.rotate(((i % 7) - 3) * 0.34);
        roundedRect(ctx, -cellSize * 0.028, -cellSize * 0.01, cellSize * 0.06, cellSize * 0.024, 3);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = palette.moss || "rgba(67, 110, 51, 0.36)";
      roundedRect(ctx, cellSize * 0.08, cellSize * 0.06, cellSize * 0.52, cellSize * 0.09, 999);
      ctx.fill();
      roundedRect(ctx, boardWidth - cellSize * 0.64, boardHeight - cellSize * 0.15, cellSize * 0.54, cellSize * 0.09, 999);
      ctx.fill();
    }

    if (env === "neon") {
      ctx.save();
      ctx.shadowColor = colorWithAlpha(palette.border, 0.5);
      ctx.shadowBlur = 14;
      ctx.strokeStyle = colorWithAlpha(palette.exit, 0.34);
      ctx.lineWidth = Math.max(1.5, cellSize * 0.032);
      roundedRect(ctx, cellSize * 0.12, cellSize * 0.12, boardWidth - cellSize * 0.24, boardHeight - cellSize * 0.24, 9);
      ctx.stroke();
      ctx.strokeStyle = colorWithAlpha(palette.border, 0.28);
      ctx.beginPath();
      ctx.moveTo(cellSize * 0.4, cellSize * 5.3);
      ctx.lineTo(boardWidth - cellSize * 0.4, cellSize * 5.3);
      ctx.stroke();
      ctx.restore();
    }

    if (env === "holiday") {
      const colors = ["#ffd166", "#ff7a86", "#70d59c", "#82b6ff"];
      for (let i = 0; i < 12; i += 1) {
        ctx.fillStyle = colors[i % colors.length];
        ctx.globalAlpha = 0.75;
        ctx.beginPath();
        ctx.arc(cellSize * (0.45 + (i % 6) * 0.96), cellSize * (i < 6 ? 0.32 : 5.66), 2.1, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  function getVehicleKind(vehicle) {
    if (vehicle.kind) return vehicle.kind;
    if (vehicle.length === 3) return vehicle.axis === "horizontal" ? "wagon" : "van";
    if (vehicle.id && vehicle.id.startsWith("block")) return "taxi";
    const colorsByKind = ["sedan", "delivery", "compact", "wagon"];
    return colorsByKind[Math.abs(hashStable(vehicle.id || `${vehicle.x},${vehicle.y}`)) % colorsByKind.length];
  }

  function getVehicleBodyRadius(kind, vehicle) {
    if (kind === "van" || kind === "delivery") return 7;
    if (kind === "compact") return 15;
    if (kind === "wagon" || vehicle.length === 3) return 9;
    return 11;
  }

  function drawTrafficVehicleDetails(ctx, vehicle, kind, x, y, width, height, axis, color) {
    ctx.save();
    const glass = "rgba(255,255,255,0.58)";
    const dark = "rgba(12,15,20,0.78)";
    const panel = "rgba(255,255,255,0.2)";
    const stripe = lighten(color, 0.34);

    if (axis === "horizontal") {
      ctx.fillStyle = glass;
      if (kind === "van" || kind === "delivery") {
        roundedRect(ctx, x + width * 0.12, y + height * 0.17, width * 0.22, height * 0.3, 5);
        ctx.fill();
        ctx.fillStyle = panel;
        roundedRect(ctx, x + width * 0.42, y + height * 0.2, width * 0.34, height * 0.42, 5);
        ctx.fill();
        ctx.fillStyle = dark;
        ctx.fillRect(x + width * 0.78, y + height * 0.22, 2, height * 0.48);
      } else if (kind === "compact") {
        roundedRect(ctx, x + width * 0.22, y + height * 0.16, width * 0.42, height * 0.3, 9);
        ctx.fill();
      } else {
        roundedRect(ctx, x + width * 0.18, y + height * 0.18, width * 0.24, height * 0.28, 5);
        ctx.fill();
        roundedRect(ctx, x + width * 0.58, y + height * 0.18, width * 0.24, height * 0.28, 5);
        ctx.fill();
      }

      if (kind === "taxi") drawTaxiMarks(ctx, x, y, width, height, axis);
      if (kind === "delivery") drawDeliveryMarks(ctx, x, y, width, height, axis, stripe);
      if (kind === "wagon") drawWagonMarks(ctx, x, y, width, height, axis, stripe);

      drawWheel(ctx, x + width * 0.18, y + height * 0.88, width * 0.11, height * 0.09);
      drawWheel(ctx, x + width * 0.78, y + height * 0.88, width * 0.11, height * 0.09);
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.fillRect(x + width - 7, y + height * 0.28, 4, height * 0.18);
      ctx.fillRect(x + width - 7, y + height * 0.56, 4, height * 0.18);
    } else {
      ctx.fillStyle = glass;
      if (kind === "van" || kind === "delivery") {
        roundedRect(ctx, x + width * 0.18, y + height * 0.12, width * 0.34, height * 0.22, 5);
        ctx.fill();
        ctx.fillStyle = panel;
        roundedRect(ctx, x + width * 0.22, y + height * 0.42, width * 0.56, height * 0.32, 5);
        ctx.fill();
      } else {
        roundedRect(ctx, x + width * 0.2, y + height * 0.16, width * 0.28, height * 0.24, 5);
        ctx.fill();
        roundedRect(ctx, x + width * 0.52, y + height * 0.58, width * 0.28, height * 0.24, 5);
        ctx.fill();
      }
      if (kind === "taxi") drawTaxiMarks(ctx, x, y, width, height, axis);
      if (kind === "delivery") drawDeliveryMarks(ctx, x, y, width, height, axis, stripe);
      if (kind === "wagon") drawWagonMarks(ctx, x, y, width, height, axis, stripe);
      drawWheel(ctx, x + width * 0.05, y + height * 0.18, width * 0.09, height * 0.1);
      drawWheel(ctx, x + width * 0.86, y + height * 0.72, width * 0.09, height * 0.1);
    }
    ctx.restore();
  }

  function drawTargetVehicleDetails(ctx, x, y, width, height, axis, skin) {
    ctx.save();
    const accent = skin.accent || "#fff2a8";
    const trim = skin.trim || "#2d1118";

    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;
    roundedRect(ctx, x + 3, y + 3, width - 6, height - 6, 12);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundedRect(ctx, x + width * 0.08, y + height * 0.1, width * 0.22, height * 0.1, 5);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.72)";
    if (axis === "horizontal") {
      roundedRect(ctx, x + width * 0.17, y + height * 0.16, width * 0.23, height * 0.28, 6);
      ctx.fill();
      roundedRect(ctx, x + width * 0.58, y + height * 0.16, width * 0.23, height * 0.28, 6);
      ctx.fill();
      drawSkinPattern(ctx, skin, x, y, width, height, axis);
      drawWheel(ctx, x + width * 0.18, y + height * 0.88, width * 0.12, height * 0.1, accent);
      drawWheel(ctx, x + width * 0.78, y + height * 0.88, width * 0.12, height * 0.1, accent);
      ctx.fillStyle = accent;
      ctx.fillRect(x + width - 7, y + height * 0.24, 4, height * 0.2);
      ctx.fillRect(x + width - 7, y + height * 0.56, 4, height * 0.2);
      drawSkinBadge(ctx, skin, x + width * 0.43, y + height * 0.55, width * 0.18, height * 0.25, trim, accent);
    } else {
      roundedRect(ctx, x + width * 0.18, y + height * 0.17, width * 0.3, height * 0.22, 6);
      ctx.fill();
      roundedRect(ctx, x + width * 0.52, y + height * 0.6, width * 0.3, height * 0.22, 6);
      ctx.fill();
      drawSkinPattern(ctx, skin, x, y, width, height, axis);
      drawWheel(ctx, x + width * 0.05, y + height * 0.18, width * 0.1, height * 0.1, accent);
      drawWheel(ctx, x + width * 0.86, y + height * 0.72, width * 0.1, height * 0.1, accent);
    }
    ctx.restore();
  }

  function drawTaxiMarks(ctx, x, y, width, height, axis) {
    ctx.save();
    ctx.fillStyle = "rgba(12,15,20,0.76)";
    if (axis === "horizontal") {
      for (let i = 0; i < 5; i += 1) ctx.fillRect(x + width * (0.22 + i * 0.07), y + height * 0.6, width * 0.035, height * 0.12);
      ctx.fillStyle = "#fff2a8";
      roundedRect(ctx, x + width * 0.42, y - height * 0.05, width * 0.16, height * 0.12, 4);
      ctx.fill();
    } else {
      for (let i = 0; i < 5; i += 1) ctx.fillRect(x + width * 0.22, y + height * (0.25 + i * 0.07), width * 0.14, height * 0.035);
    }
    ctx.restore();
  }

  function drawDeliveryMarks(ctx, x, y, width, height, axis, stripe) {
    ctx.save();
    ctx.fillStyle = stripe;
    if (axis === "horizontal") {
      roundedRect(ctx, x + width * 0.48, y + height * 0.66, width * 0.22, height * 0.1, 4);
      ctx.fill();
      ctx.fillStyle = "rgba(12,15,20,0.35)";
      ctx.fillRect(x + width * 0.55, y + height * 0.26, 2, height * 0.36);
    } else {
      roundedRect(ctx, x + width * 0.18, y + height * 0.48, width * 0.18, height * 0.22, 4);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawWagonMarks(ctx, x, y, width, height, axis, stripe) {
    ctx.save();
    ctx.strokeStyle = stripe;
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (axis === "horizontal") {
      ctx.moveTo(x + width * 0.16, y + height * 0.68);
      ctx.lineTo(x + width * 0.84, y + height * 0.68);
    } else {
      ctx.moveTo(x + width * 0.68, y + height * 0.16);
      ctx.lineTo(x + width * 0.68, y + height * 0.84);
    }
    ctx.stroke();
    ctx.restore();
  }

  function drawSkinPattern(ctx, skin, x, y, width, height, axis) {
    ctx.save();
    const accent = skin.accent || "#fff2a8";
    const trim = skin.trim || "#2d1118";
    ctx.fillStyle = accent;
    ctx.strokeStyle = accent;
    ctx.lineWidth = 3;

    if (skin.pattern === "checker") {
      const size = Math.max(4, height * 0.12);
      for (let i = 0; i < 8; i += 1) {
        ctx.fillStyle = i % 2 ? accent : trim;
        ctx.fillRect(x + width * 0.18 + i * size, y + height * 0.62, size, size);
      }
    } else if (skin.pattern === "parcel") {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.2, y + height * 0.75);
      ctx.lineTo(x + width * 0.78, y + height * 0.22);
      ctx.stroke();
      roundedRect(ctx, x + width * 0.7, y + height * 0.52, width * 0.13, height * 0.2, 4);
      ctx.fill();
    } else if (skin.pattern === "pizza") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.moveTo(x + width * 0.24, y + height * 0.72);
      ctx.lineTo(x + width * 0.5, y + height * 0.42);
      ctx.lineTo(x + width * 0.72, y + height * 0.72);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = trim;
      ctx.beginPath();
      ctx.arc(x + width * 0.48, y + height * 0.62, height * 0.035, 0, Math.PI * 2);
      ctx.arc(x + width * 0.58, y + height * 0.65, height * 0.035, 0, Math.PI * 2);
      ctx.fill();
    } else if (skin.pattern === "neon") {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.12, y + height * 0.7);
      ctx.lineTo(x + width * 0.88, y + height * 0.7);
      ctx.stroke();
    } else if (skin.pattern === "siren" || skin.pattern === "medical") {
      roundedRect(ctx, x + width * 0.42, y - height * 0.04, width * 0.16, height * 0.12, 4);
      ctx.fill();
      if (skin.pattern === "medical") {
        ctx.fillRect(x + width * 0.47, y + height * 0.52, width * 0.06, height * 0.22);
        ctx.fillRect(x + width * 0.41, y + height * 0.6, width * 0.18, height * 0.06);
      }
    } else if (skin.pattern === "hazard") {
      for (let i = 0; i < 5; i += 1) ctx.fillRect(x + width * (0.18 + i * 0.12), y + height * 0.64, width * 0.07, height * 0.12);
    } else if (skin.pattern === "retro") {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      roundedRect(ctx, x + width * 0.16, y + height * 0.58, width * 0.68, height * 0.12, 999);
      ctx.stroke();
    } else if (skin.pattern === "business" || skin.pattern === "vip") {
      ctx.fillStyle = accent;
      roundedRect(ctx, x + width * 0.14, y + height * 0.63, width * 0.72, height * 0.07, 999);
      ctx.fill();
      if (skin.pattern === "vip") drawSkinBadge(ctx, skin, x + width * 0.38, y + height * 0.48, width * 0.24, height * 0.18, trim, accent);
    } else if (skin.pattern === "stickers" || skin.pattern === "graffiti") {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x + width * 0.28, y + height * 0.64, height * 0.06, 0, Math.PI * 2);
      ctx.arc(x + width * 0.5, y + height * 0.57, height * 0.05, 0, Math.PI * 2);
      ctx.arc(x + width * 0.68, y + height * 0.66, height * 0.045, 0, Math.PI * 2);
      ctx.fill();
      if (skin.pattern === "graffiti") {
        ctx.strokeStyle = accent;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x + width * 0.2, y + height * 0.76);
        ctx.quadraticCurveTo(x + width * 0.45, y + height * 0.46, x + width * 0.8, y + height * 0.72);
        ctx.stroke();
      }
    } else if (skin.pattern === "comet") {
      ctx.beginPath();
      ctx.arc(x + width * 0.72, y + height * 0.56, height * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(x + width * 0.22, y + height * 0.72);
      ctx.lineTo(x + width * 0.67, y + height * 0.55);
      ctx.stroke();
    } else if (skin.pattern === "chrome") {
      ctx.strokeStyle = "rgba(255,255,255,0.85)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + width * 0.14, y + height * 0.36);
      ctx.lineTo(x + width * 0.86, y + height * 0.68);
      ctx.moveTo(x + width * 0.18, y + height * 0.7);
      ctx.lineTo(x + width * 0.72, y + height * 0.44);
      ctx.stroke();
    } else if (skin.pattern === "cyber") {
      ctx.strokeStyle = accent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + width * 0.16, y + height * 0.62);
      ctx.lineTo(x + width * 0.36, y + height * 0.62);
      ctx.lineTo(x + width * 0.48, y + height * 0.5);
      ctx.lineTo(x + width * 0.78, y + height * 0.5);
      ctx.stroke();
    } else if (skin.pattern === "crown") {
      ctx.beginPath();
      ctx.moveTo(x + width * 0.35, y + height * 0.68);
      ctx.lineTo(x + width * 0.42, y + height * 0.5);
      ctx.lineTo(x + width * 0.5, y + height * 0.66);
      ctx.lineTo(x + width * 0.58, y + height * 0.5);
      ctx.lineTo(x + width * 0.66, y + height * 0.68);
      ctx.closePath();
      ctx.fill();
    } else if (skin.pattern === "tow") {
      ctx.strokeStyle = trim;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x + width * 0.62, y + height * 0.22);
      ctx.lineTo(x + width * 0.78, y - height * 0.08);
      ctx.lineTo(x + width * 0.88, y + height * 0.02);
      ctx.stroke();
      ctx.fillStyle = accent;
      roundedRect(ctx, x + width * 0.7, y + height * 0.6, width * 0.16, height * 0.12, 3);
      ctx.fill();
    } else {
      ctx.fillRect(x + width * 0.45, y + height * 0.13, width * 0.08, height * 0.74);
    }
    ctx.restore();
  }

  function drawSkinBadge(ctx, skin, x, y, width, height, textColor, background) {
    ctx.save();
    ctx.fillStyle = background;
    roundedRect(ctx, x, y, width, height, 5);
    ctx.fill();
    ctx.fillStyle = textColor;
    ctx.font = `${Math.max(8, Math.floor(height * 0.58))}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(skin.badge || "", x + width / 2, y + height / 2 + 0.5);
    ctx.restore();
  }

  function drawWheel(ctx, x, y, width, height, accent) {
    ctx.fillStyle = "rgba(12,15,20,0.78)";
    roundedRect(ctx, x, y, width, height, 4);
    ctx.fill();
    if (accent) {
      ctx.fillStyle = accent;
      roundedRect(ctx, x + width * 0.25, y + height * 0.22, width * 0.5, height * 0.56, 3);
      ctx.fill();
    }
  }

  function drawObstacle(ctx, obstacle, options) {
    const cellSize = options.cellSize;
    const pos = options.position;
    const palette = getYardPalette(options);
    const obstacleKind = obstacle.kind || "bin";
    const themedSprite = getYardObstacleSprite(options.yardTheme || {}, obstacleKind);
    const pad = themedSprite ? cellSize * 0.02 : cellSize * 0.22;
    const x = pos.x + pad;
    const y = pos.y + pad;
    const size = cellSize - pad * 2;
    const variant = Math.abs(hashStable(`${options.levelId || "level"}:${obstacle.id || obstacle.kind}`));
    const tilt = ((variant % 7) - 3) * 0.018;
    const hueShift = (variant % 5) * 0.04;
    const cx = x + size / 2;
    const cy = y + size / 2;

    ctx.save();
    ctx.fillStyle = "rgba(17, 21, 28, 0.16)";
    ctx.beginPath();
    ctx.ellipse(x + size / 2, y + size * 0.86, size * 0.45, size * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.translate(cx, cy);
    ctx.rotate(tilt);
    ctx.translate(-cx, -cy);
    ctx.shadowColor = "rgba(0,0,0,0.24)";
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 3;

    if (themedSprite) {
      drawImageContain(ctx, themedSprite, x, y, size, size);
      ctx.restore();
      return;
    }

    if (obstacleKind === "cone") {
      const body = hueShift > 0.12 ? lighten(palette.cone, 0.08) : palette.cone;
      ctx.fillStyle = palette.coneBase;
      roundedRect(ctx, x + size * 0.12, y + size * 0.76, size * 0.76, size * 0.12, size * 0.04);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.moveTo(x + size * 0.5, y + size * 0.07);
      ctx.lineTo(x + size * 0.78, y + size * 0.78);
      ctx.lineTo(x + size * 0.22, y + size * 0.78);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.82)";
      roundedRect(ctx, x + size * 0.34, y + size * 0.38, size * 0.32, size * 0.08, size * 0.025);
      ctx.fill();
      roundedRect(ctx, x + size * 0.28, y + size * 0.6, size * 0.44, size * 0.08, size * 0.025);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.24)";
      ctx.beginPath();
      ctx.moveTo(x + size * 0.5, y + size * 0.12);
      ctx.lineTo(x + size * 0.58, y + size * 0.72);
      ctx.lineTo(x + size * 0.5, y + size * 0.72);
      ctx.closePath();
      ctx.fill();
    } else if (obstacleKind === "snow") {
      ctx.fillStyle = palette.snow;
      roundedRect(ctx, x + size * 0.05, y + size * 0.38, size * 0.9, size * 0.42, size * 0.16);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(255,255,255,0.8)";
      ctx.beginPath();
      ctx.arc(x + size * 0.28, y + size * 0.42, size * 0.2, 0, Math.PI * 2);
      ctx.arc(x + size * 0.52, y + size * 0.34, size * 0.24, 0, Math.PI * 2);
      ctx.arc(x + size * 0.74, y + size * 0.45, size * 0.18, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(91,135,158,0.32)";
      ctx.lineWidth = Math.max(1, size * 0.035);
      ctx.beginPath();
      ctx.moveTo(x + size * 0.2, y + size * 0.62);
      ctx.quadraticCurveTo(x + size * 0.5, y + size * 0.72, x + size * 0.82, y + size * 0.58);
      ctx.stroke();
    } else if (obstacleKind === "gate") {
      ctx.fillStyle = palette.gateDark;
      roundedRect(ctx, x + size * 0.14, y + size * 0.22, size * 0.1, size * 0.58, size * 0.03);
      ctx.fill();
      roundedRect(ctx, x + size * 0.76, y + size * 0.22, size * 0.1, size * 0.58, size * 0.03);
      ctx.fill();
      ctx.fillStyle = palette.gate;
      roundedRect(ctx, x + size * 0.1, y + size * 0.35, size * 0.8, size * 0.24, size * 0.04);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.beginPath();
      roundedRect(ctx, x + size * 0.1, y + size * 0.35, size * 0.8, size * 0.24, size * 0.04);
      ctx.clip();
      ctx.strokeStyle = palette.winCoin;
      ctx.lineWidth = size * 0.09;
      for (let i = -1; i < 4; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x + size * (0.1 + i * 0.24), y + size * 0.62);
        ctx.lineTo(x + size * (0.34 + i * 0.24), y + size * 0.32);
        ctx.stroke();
      }
      ctx.restore();
    } else {
      const body = hueShift > 0.12 ? lighten(palette.bin, 0.07) : palette.bin;
      ctx.fillStyle = palette.binDark;
      roundedRect(ctx, x + size * 0.17, y + size * 0.1, size * 0.66, size * 0.14, size * 0.04);
      ctx.fill();
      ctx.fillStyle = body;
      roundedRect(ctx, x + size * 0.14, y + size * 0.2, size * 0.72, size * 0.62, size * 0.08);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(12,15,20,0.22)";
      roundedRect(ctx, x + size * 0.21, y + size * 0.28, size * 0.58, size * 0.08, size * 0.03);
      ctx.fill();
      ctx.fillStyle = "rgba(255,255,255,0.22)";
      roundedRect(ctx, x + size * 0.24, y + size * 0.42, size * 0.1, size * 0.28, size * 0.025);
      ctx.fill();
      roundedRect(ctx, x + size * 0.66, y + size * 0.42, size * 0.1, size * 0.28, size * 0.025);
      ctx.fill();
      ctx.fillStyle = "#101822";
      ctx.beginPath();
      ctx.arc(x + size * 0.27, y + size * 0.84, size * 0.055, 0, Math.PI * 2);
      ctx.arc(x + size * 0.73, y + size * 0.84, size * 0.055, 0, Math.PI * 2);
      ctx.fill();
    }

    drawObstacleThemeOverlay(ctx, { x, y, size, palette, theme: options.yardTheme || {}, obstacle });
    ctx.restore();
  }

  function drawObstacleThemeOverlay(ctx, options) {
    const { x, y, size, palette, theme, obstacle } = options;
    const env = getYardEnvironment(theme);
    ctx.save();
    ctx.shadowBlur = 0;

    if (env === "winter") {
      ctx.fillStyle = "rgba(250, 253, 255, 0.82)";
      roundedRect(ctx, x + size * 0.16, y + size * 0.12, size * 0.68, size * 0.13, size * 0.05);
      ctx.fill();
      if (obstacle.kind === "cone") {
        ctx.fillStyle = "rgba(250, 253, 255, 0.72)";
        roundedRect(ctx, x + size * 0.28, y + size * 0.68, size * 0.44, size * 0.08, size * 0.03);
        ctx.fill();
      }
    } else if (env === "rainy") {
      ctx.strokeStyle = "rgba(225, 248, 255, 0.42)";
      ctx.lineWidth = Math.max(1, size * 0.035);
      ctx.beginPath();
      ctx.moveTo(x + size * 0.22, y + size * 0.26);
      ctx.lineTo(x + size * 0.78, y + size * 0.2);
      ctx.stroke();
      ctx.fillStyle = palette.puddle || "rgba(143, 205, 230, 0.16)";
      ctx.beginPath();
      ctx.ellipse(x + size * 0.54, y + size * 0.88, size * 0.34, size * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (env === "aged") {
      ctx.strokeStyle = "rgba(80, 43, 18, 0.42)";
      ctx.lineWidth = Math.max(1, size * 0.03);
      ctx.beginPath();
      ctx.moveTo(x + size * 0.25, y + size * 0.3);
      ctx.lineTo(x + size * 0.72, y + size * 0.7);
      ctx.stroke();
      ctx.fillStyle = "rgba(255, 210, 110, 0.12)";
      ctx.beginPath();
      ctx.arc(x + size * 0.68, y + size * 0.34, size * 0.05, 0, Math.PI * 2);
      ctx.fill();
    } else if (env === "neon") {
      ctx.shadowColor = colorWithAlpha(palette.border, 0.42);
      ctx.shadowBlur = 7;
      ctx.strokeStyle = colorWithAlpha(palette.border, 0.5);
      ctx.lineWidth = Math.max(1, size * 0.025);
      roundedRect(ctx, x + size * 0.08, y + size * 0.08, size * 0.84, size * 0.76, size * 0.08);
      ctx.stroke();
    } else if (env === "underground") {
      ctx.fillStyle = "rgba(225, 190, 85, 0.72)";
      roundedRect(ctx, x + size * 0.15, y + size * 0.78, size * 0.7, size * 0.07, size * 0.025);
      ctx.fill();
      ctx.fillStyle = "rgba(20, 22, 26, 0.46)";
      roundedRect(ctx, x + size * 0.2, y + size * 0.78, size * 0.12, size * 0.07, size * 0.02);
      roundedRect(ctx, x + size * 0.5, y + size * 0.78, size * 0.12, size * 0.07, size * 0.02);
      ctx.fill();
    } else if (env === "holiday") {
      ctx.fillStyle = palette.winCoin || "#ffd166";
      ctx.shadowColor = palette.winCoin || "#ffd166";
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(x + size * 0.76, y + size * 0.22, size * 0.045, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function drawActor(ctx, actor, options) {
    if (actor.inactive) return;
    const pos = options.position;
    const cellSize = options.cellSize;
    const centerX = pos.x + cellSize / 2;
    const centerY = pos.y + cellSize / 2;
    const radius = cellSize * 0.26;
    const colors = {
      courier: { body: "#19bf82", accent: "#ffc83d", dark: "#0d6f54" },
      janitor: { body: "#ff8a1f", accent: "#d9f0ff", dark: "#8c4700" },
      pedestrian: { body: "#d7dde8", accent: "#6f7e8d", dark: "#4c5968" }
    };
    const palette = colors[actor.kind] || colors.pedestrian;

    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.3)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 4;

    ctx.fillStyle = "rgba(0,0,0,0.18)";
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + radius * 1.05, radius * 0.92, radius * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = palette.body;
    roundedRect(ctx, centerX - radius * 0.62, centerY - radius * 0.1, radius * 1.24, radius * 1.18, 8);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    roundedRect(ctx, centerX - radius * 0.42, centerY + radius * 0.08, radius * 0.34, radius * 0.68, 4);
    ctx.fill();

    ctx.fillStyle = palette.accent;
    if (actor.kind === "courier") {
      roundedRect(ctx, centerX + radius * 0.18, centerY + radius * 0.02, radius * 0.68, radius * 0.82, 5);
      ctx.fill();
      ctx.fillStyle = palette.dark;
      ctx.fillRect(centerX + radius * 0.34, centerY + radius * 0.18, radius * 0.36, 3);
    } else if (actor.kind === "janitor") {
      ctx.fillRect(centerX + radius * 0.62, centerY - radius * 0.4, 4, radius * 1.65);
      ctx.fillRect(centerX + radius * 0.42, centerY + radius * 1.1, radius * 0.52, 4);
    } else {
      ctx.beginPath();
      ctx.arc(centerX, centerY + radius * 0.38, radius * 0.22, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = "#f4d7b7";
    ctx.beginPath();
    ctx.arc(centerX, centerY - radius * 0.55, radius * 0.42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = palette.dark;
    ctx.beginPath();
    ctx.arc(centerX, centerY - radius * 0.78, radius * 0.3, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawYard(ctx, options) {
    const level = options.level;
    const cellSize = options.cellSize;
    const boardPad = options.boardPad;
    const width = options.width;
    const height = options.height;
    const theme = options.yardTheme || {};
    const palette = getYardPalette(options);
    const boardWidth = level.width * cellSize;
    const boardHeight = level.height * cellSize;
    const boardTexture = getLoadedYardAsset(theme.assets && theme.assets.board);
    if (usesFullArtBoard(theme, level) && boardTexture) {
      ctx.fillStyle = theme.palette && theme.palette.base ? theme.palette.base : "#070b08";
      roundedRect(ctx, 0, 0, width, height, 8);
      ctx.fill();
      ctx.save();
      roundedRect(ctx, 0, 0, width, height, 8);
      ctx.clip();
      drawImageCover(ctx, boardTexture, 0, 0, width, height);
      ctx.restore();
      return;
    }

    ctx.fillStyle = makeGradient(ctx, 0, 0, width, height, palette.outer);
    roundedRect(ctx, 0, 0, width, height, 8);
    ctx.fill();

    ctx.save();
    ctx.fillStyle = palette.curb;
    ctx.fillRect(0, 0, width, boardPad * 0.72);
    ctx.fillRect(0, height - boardPad * 0.72, width, boardPad * 0.72);
    ctx.fillStyle = palette.curbLine;
    ctx.fillRect(boardPad - 4, boardPad - 6, boardWidth + 8, 3);
    ctx.fillRect(boardPad - 4, boardPad + boardHeight + 3, boardWidth + 8, 3);
    ctx.fillStyle = palette.sideShadow;
    ctx.globalAlpha = 0.36;
    ctx.fillRect(boardPad - 7, boardPad - 1, 4, boardHeight + 2);
    ctx.fillRect(boardPad + boardWidth + 3, boardPad - 1, 4, boardHeight + 2);
    ctx.globalAlpha = 0.55;
    if (theme.boardStyle === "holiday") {
      ctx.fillStyle = palette.winCoin;
      for (let i = 0; i < 9; i += 1) ctx.fillRect(boardPad + i * (boardWidth / 8) - 1, boardPad - 9, 3, 3);
    } else if (theme.boardStyle === "underground" || theme.boardStyle === "concrete") {
      ctx.fillStyle = "rgba(255,255,255,0.18)";
      ctx.fillRect(boardPad + boardWidth * 0.18, boardPad - 10, boardWidth * 0.22, 3);
      ctx.fillRect(boardPad + boardWidth * 0.6, boardPad - 10, boardWidth * 0.22, 3);
    }
    drawYardFrameDetails(ctx, { theme, palette, width, height, boardPad, boardWidth, boardHeight, cellSize });
    ctx.globalAlpha = 1;
    ctx.restore();

    ctx.save();
    ctx.translate(boardPad, boardPad);

    ctx.save();
    roundedRect(ctx, 0, 0, boardWidth, boardHeight, 7);
    ctx.clip();
    if (boardTexture) {
      drawImageCover(ctx, boardTexture, 0, 0, boardWidth, boardHeight);
      ctx.fillStyle = getYardEnvironment(theme) === "forest_parking" ? "rgba(5, 8, 5, 0.22)" : "rgba(9, 15, 24, 0.08)";
      ctx.fillRect(0, 0, boardWidth, boardHeight);
    } else {
      ctx.fillStyle = makeGradient(ctx, 0, 0, boardWidth, boardHeight, palette.asphalt);
      ctx.fillRect(0, 0, boardWidth, boardHeight);
    }
    ctx.restore();
    const exitLaneY = level.exit.row * cellSize;
    ctx.fillStyle = colorWithAlpha(palette.exitGlow, 0.045);
    ctx.fillRect(cellSize * 0.08, exitLaneY + cellSize * 0.24, boardWidth - cellSize * 0.08, cellSize * 0.52);

    const lineWidth = Math.max(1, Math.min(2, cellSize * 0.04));
    for (let y = 0; y < level.height; y += 1) {
      for (let x = 0; x < level.width; x += 1) {
        if ((x + y) % 2 === 0) {
          ctx.fillStyle = palette.tile;
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }

        ctx.strokeStyle = palette.slotLine;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(x * cellSize + cellSize * 0.18, y * cellSize + cellSize * 0.16);
        ctx.lineTo(x * cellSize + cellSize * 0.82, y * cellSize + cellSize * 0.16);
        ctx.stroke();
      }
    }

    ctx.strokeStyle = palette.gridLine;
    ctx.lineWidth = 1;
    for (let i = 0; i <= level.width; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * cellSize, 0);
      ctx.lineTo(i * cellSize, boardHeight);
      ctx.stroke();
    }
    for (let i = 0; i <= level.height; i += 1) {
      ctx.beginPath();
      ctx.moveTo(0, i * cellSize);
      ctx.lineTo(boardWidth, i * cellSize);
      ctx.stroke();
    }

    ctx.strokeStyle = palette.dashLine;
    ctx.lineWidth = Math.max(1, cellSize * 0.035);
    ctx.setLineDash([cellSize * 0.26, cellSize * 0.2]);
    for (let row = 1; row < level.height; row += 2) {
      ctx.beginPath();
      ctx.moveTo(cellSize * 0.18, row * cellSize + cellSize * 0.5);
      ctx.lineTo(boardWidth - cellSize * 0.18, row * cellSize + cellSize * 0.5);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    ctx.fillStyle = palette.speck;
    const specks = Math.min(56, 20 + level.width * level.height * 0.24);
    for (let i = 0; i < specks; i += 1) {
      const x = ((i * 37) % 100) / 100 * boardWidth;
      const y = ((i * 53) % 100) / 100 * boardHeight;
      const size = i % 5 === 0 ? 3 : 2;
      ctx.fillRect(x, y, size, size);
    }

    drawYardSurfaceDetails(ctx, { theme, palette, boardWidth, boardHeight, cellSize });

    if (theme.boardStyle === "winter") {
      ctx.fillStyle = "rgba(255,255,255,0.38)";
      roundedRect(ctx, 5, 5, boardWidth - 10, cellSize * 0.16, cellSize * 0.08);
      ctx.fill();
      roundedRect(ctx, 5, boardHeight - cellSize * 0.18 - 5, boardWidth - 10, cellSize * 0.16, cellSize * 0.08);
      ctx.fill();
    } else if (theme.boardStyle === "aged" || theme.boardStyle === "forest_parking") {
      ctx.fillStyle = "rgba(0,0,0,0.08)";
      for (let i = 0; i < 5; i += 1) {
        roundedRect(ctx, ((i * 47) % 100) / 100 * boardWidth, ((i * 31) % 100) / 100 * boardHeight, cellSize * 0.36, cellSize * 0.11, 7);
        ctx.fill();
      }
    } else if (theme.boardStyle === "neon") {
      ctx.save();
      ctx.shadowColor = colorWithAlpha(palette.border, 0.45);
      ctx.shadowBlur = 14;
      ctx.strokeStyle = colorWithAlpha(palette.exit, 0.28);
      ctx.lineWidth = 1.5;
      roundedRect(ctx, cellSize * 0.12, cellSize * 0.12, boardWidth - cellSize * 0.24, boardHeight - cellSize * 0.24, 9);
      ctx.stroke();
      ctx.restore();
    }

    ctx.strokeStyle = palette.border;
    ctx.lineWidth = Math.max(1.5, cellSize * 0.035);
    roundedRect(ctx, 1, 1, boardWidth - 2, boardHeight - 2, 7);
    ctx.stroke();

    ctx.restore();
  }

  function drawActorRoutes(ctx, options) {
    const actors = options.actors || [];
    actors.forEach((actor) => {
      if (actor.inactive || !actor.path || actor.path.length < 2) return;
      const nextStep = options.getNextActorStep(actor);
      const visiblePath = actor.path.slice(Math.max(0, actor.stepIndex));
      const exitPoint = options.getActorRouteExitPoint(actor);
      const routeBlocked = actor.waitTurns > 0 || actor.needsReroute;
      ctx.save();
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = routeBlocked ? "rgba(239, 64, 86, 0.18)" : "rgba(25, 191, 130, 0.18)";
      ctx.lineWidth = 10;
      ctx.beginPath();
      visiblePath.forEach((point, index) => {
        const pos = options.boardToScreen(point.x + 0.5, point.y + 0.5);
        if (index === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
      });
      if (exitPoint) ctx.lineTo(exitPoint.x, exitPoint.y);
      ctx.stroke();

      ctx.strokeStyle = routeBlocked ? "rgba(239, 64, 86, 0.72)" : "rgba(25, 191, 130, 0.78)";
      ctx.fillStyle = routeBlocked ? "rgba(239, 64, 86, 0.95)" : "rgba(255, 200, 61, 0.96)";
      ctx.lineWidth = 4;
      ctx.setLineDash([6, 7]);
      ctx.beginPath();
      visiblePath.forEach((point, index) => {
        const pos = options.boardToScreen(point.x + 0.5, point.y + 0.5);
        if (index === 0) ctx.moveTo(pos.x, pos.y);
        else ctx.lineTo(pos.x, pos.y);
      });
      if (exitPoint) ctx.lineTo(exitPoint.x, exitPoint.y);
      ctx.stroke();
      ctx.setLineDash([]);

      visiblePath.forEach((point, index) => {
        if (index % 2 !== 0 && index !== visiblePath.length - 1) return;
        const pos = options.boardToScreen(point.x + 0.5, point.y + 0.5);
        ctx.globalAlpha = index === 0 ? 0.9 : 0.55;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, index === 0 ? 4.5 : 3, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      if (nextStep) {
        const isFinalStep = nextStep.index === actor.path.length - 1;
        const pos = isFinalStep && exitPoint ? exitPoint : options.boardToScreen(nextStep.point.x + 0.5, nextStep.point.y + 0.5);
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 6.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    });
  }

  function drawMoveGuide(ctx, options) {
    if (!options.selected || !options.level) return;
    const vehicle = (options.vehicles || []).find((item) => item.id === options.selected.vehicleId);
    if (!vehicle) return;

    const from = options.selected.range.min;
    const to = options.selected.range.max;
    const cellSize = options.cellSize;
    ctx.save();
    ctx.fillStyle = "rgba(130, 182, 255, 0.12)";
    ctx.strokeStyle = "rgba(178, 212, 255, 0.42)";
    ctx.lineWidth = Math.max(1, cellSize * 0.018);

    const x = vehicle.axis === "horizontal" ? vehicle.x + from : vehicle.x;
    const y = vehicle.axis === "vertical" ? vehicle.y + from : vehicle.y;
    const width = vehicle.axis === "horizontal" ? (vehicle.length + to - from) * cellSize : cellSize;
    const height = vehicle.axis === "vertical" ? (vehicle.length + to - from) * cellSize : cellSize;
    const pos = options.boardToScreen(x, y);
    roundedRect(ctx, pos.x + 5, pos.y + 5, width - 10, height - 10, 12);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }

  function getVehicleScreenRect(options, vehicle, x, y) {
    const pos = options.boardToScreen(x, y);
    const cellSize = options.cellSize;
    const width = vehicle.axis === "horizontal" ? vehicle.length * cellSize : cellSize;
    const height = vehicle.axis === "vertical" ? vehicle.length * cellSize : cellSize;
    const fullBoardPreview = usesFullArtBoard(options.yardTheme, options.level || {});
    const pad = fullBoardPreview ? cellSize * 0.02 : cellSize * 0.1;
    return {
      x: pos.x + pad,
      y: pos.y + pad,
      width: width - pad * 2,
      height: height - pad * 2
    };
  }

  function drawHint(ctx, options) {
    const hint = options.activeHint;
    if (!hint) return;
    const pulse = options.pulse || 0;

    if (hint.kind === "smart") drawSmartHintMove(ctx, hint, options, pulse);
    if (hint.line) drawHintLine(ctx, hint.line, options, pulse);
    if (hint.lineOnly) {
      const target = (options.vehicles || []).find((vehicle) => vehicle.id === options.level.targetVehicleId);
      if (target) drawHintLine(ctx, { fromX: target.x + target.length, toX: options.level.width, y: target.y }, options, pulse);
    }

    if (hint.vehicleId) {
      const vehicle = (options.vehicles || []).find((item) => item.id === hint.vehicleId);
      if (vehicle) {
        const visual = options.getVehicleVisual(vehicle);
        const pos = options.boardToScreen(visual.x, visual.y);
        const width = vehicle.axis === "horizontal" ? vehicle.length * options.cellSize : options.cellSize;
        const height = vehicle.axis === "vertical" ? vehicle.length * options.cellSize : options.cellSize;
        ctx.save();
        ctx.shadowColor = `rgba(130, 182, 255, ${0.28 + pulse * 0.18})`;
        ctx.shadowBlur = 10 + pulse * 8;
        ctx.strokeStyle = `rgba(178, 212, 255, ${0.42 + pulse * 0.24})`;
        ctx.lineWidth = Math.max(1.5, options.cellSize * 0.026);
        roundedRect(ctx, pos.x + 6, pos.y + 6, width - 12, height - 12, 12);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (hint.actorId) {
      const actor = (options.actors || []).find((item) => item.id === hint.actorId);
      if (actor && !actor.inactive) {
        drawActorPath(ctx, actor, options, pulse);
        const visual = options.getActorVisual(actor);
        const pos = options.boardToScreen(visual.x, visual.y);
        ctx.save();
        ctx.strokeStyle = `rgba(178, 212, 255, ${0.5 + pulse * 0.28})`;
        ctx.lineWidth = Math.max(1.5, options.cellSize * 0.026);
        roundedRect(ctx, pos.x + options.cellSize * 0.14, pos.y + options.cellSize * 0.14, options.cellSize * 0.72, options.cellSize * 0.72, 14);
        ctx.stroke();
        ctx.restore();
        if (hint.actorStep) drawActorStepDot(ctx, actor, hint.actorStep.point, options, pulse);
      }
    }
  }

  function drawTutorialHint(ctx, options) {
    const hint = options.activeHint;
    if (!hint || hint.kind !== "tutorial") return;
    const vehicle = (options.vehicles || []).find((item) => item.id === hint.vehicleId);
    if (!vehicle) return;

    const pulse = options.pulse || 0;
    const current = options.getVehicleVisual(vehicle);
    const currentRect = getVehicleScreenRect(options, vehicle, current.x, current.y);
    const targetRect = getVehicleScreenRect(options, vehicle, hint.targetX, hint.targetY);
    const boardWidth = options.level.width * options.cellSize;
    const boardHeight = options.level.height * options.cellSize;
    const boardPadX = options.boardPadX ?? options.boardPad;
    const boardPadY = options.boardPadY ?? options.boardPad;

    ctx.save();
    ctx.fillStyle = "rgba(3, 7, 13, 0.06)";
    roundedRect(ctx, boardPadX, boardPadY, boardWidth, boardHeight, 7);
    ctx.fill();
    ctx.restore();

    drawTutorialPath(ctx, currentRect, targetRect, options, pulse);
    drawTutorialGhost(ctx, vehicle, targetRect, options, pulse);
    options.drawVehicle(vehicle);
    drawTutorialVehicleRing(ctx, currentRect, options, pulse);
    // Текстовые бейджи на поле убраны — направляют кольцо вокруг машины,
    // пунктирный путь и призрак-цель; инструкция есть на карточке.
  }

  function drawTutorialPath(ctx, fromRect, toRect, options, pulse) {
    const from = { x: fromRect.x + fromRect.width / 2, y: fromRect.y + fromRect.height / 2 };
    const to = { x: toRect.x + toRect.width / 2, y: toRect.y + toRect.height / 2 };
    const cellSize = options.cellSize;
    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(130, 182, 255, ${0.12 + pulse * 0.04})`;
    ctx.lineWidth = Math.max(2, cellSize * 0.052);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();

    ctx.strokeStyle = `rgba(178, 212, 255, ${0.34 + pulse * 0.1})`;
    ctx.lineWidth = Math.max(1.25, cellSize * 0.024);
    ctx.setLineDash([cellSize * 0.1, cellSize * 0.16]);
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
    ctx.restore();
  }

  function drawTutorialGhost(ctx, vehicle, rect, options, pulse) {
    const color = options.getVehicleColor(vehicle);
    const cellSize = options.cellSize;
    ctx.save();
    ctx.shadowColor = "rgba(130, 182, 255, 0.24)";
    ctx.shadowBlur = 6 + pulse * 4;
    ctx.globalAlpha = 0.13 + pulse * 0.04;
    ctx.fillStyle = color;
    roundedRect(ctx, rect.x, rect.y, rect.width, rect.height, vehicle.id === options.level.targetVehicleId ? 14 : 11);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.28 + pulse * 0.08})`;
    ctx.lineWidth = Math.max(1, cellSize * 0.018);
    ctx.setLineDash([cellSize * 0.12, cellSize * 0.1]);
    roundedRect(ctx, rect.x - 3, rect.y - 3, rect.width + 6, rect.height + 6, 15);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = `rgba(178, 212, 255, ${0.36 + pulse * 0.12})`;
    ctx.lineWidth = Math.max(1.25, cellSize * 0.022);
    roundedRect(ctx, rect.x - 5, rect.y - 5, rect.width + 10, rect.height + 10, 15);
    ctx.stroke();
    ctx.restore();
  }

  function drawTutorialVehicleRing(ctx, rect, options, pulse) {
    const cellSize = options.cellSize;
    ctx.save();
    ctx.shadowColor = "rgba(130, 182, 255, 0.34)";
    ctx.shadowBlur = 7 + pulse * 4;
    ctx.strokeStyle = `rgba(178, 212, 255, ${0.58 + pulse * 0.14})`;
    ctx.lineWidth = Math.max(1.4, cellSize * 0.024);
    roundedRect(ctx, rect.x - 4, rect.y - 4, rect.width + 8, rect.height + 8, 15);
    ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.28)";
    ctx.lineWidth = Math.max(1, cellSize * 0.018);
    roundedRect(ctx, rect.x - 7, rect.y - 7, rect.width + 14, rect.height + 14, 17);
    ctx.stroke();
    ctx.restore();
  }

  function drawTutorialBadge(ctx, text, x, y, type, options) {
    if (!text) return;
    const label = String(text);
    const cellSize = options.cellSize;
    const fontSize = Math.max(11, Math.min(14, cellSize * 0.24));
    ctx.save();
    ctx.font = `800 ${fontSize}px system-ui, -apple-system, Segoe UI, sans-serif`;
    const paddingX = fontSize * 0.85;
    const paddingY = fontSize * 0.48;
    const width = Math.min(options.level.width * cellSize - 12, ctx.measureText(label).width + paddingX * 2);
    const height = fontSize + paddingY * 2;
    const boardPadX = options.boardPadX ?? options.boardPad;
    const boardPadY = options.boardPadY ?? options.boardPad;
    const boardLeft = boardPadX + 6;
    const boardRight = boardPadX + options.level.width * cellSize - 6;
    const anchorX = type === "source" ? x : x - width / 2;
    const bx = clamp(anchorX, boardLeft, boardRight - width);
    const by = clamp(y - height, boardPadY + 6, boardPadY + options.level.height * cellSize - height - 6);

    ctx.fillStyle = type === "source" ? "rgba(232, 189, 106, 0.94)" : "rgba(130, 182, 255, 0.94)";
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = 1;
    roundedRect(ctx, bx, by, width, height, height / 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = type === "source" ? "#1a1203" : "#06101f";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, bx + width / 2, by + height / 2 + 0.5);
    ctx.restore();
  }

  function drawSmartHintMove(ctx, hint, options, pulse) {
    const vehicle = (options.vehicles || []).find((item) => item.id === hint.vehicleId);
    if (!vehicle) return;
    const cellSize = options.cellSize;
    const width = vehicle.axis === "horizontal" ? vehicle.length * cellSize : cellSize;
    const height = vehicle.axis === "vertical" ? vehicle.length * cellSize : cellSize;
    const from = options.boardToScreen(vehicle.x, vehicle.y);
    const to = options.boardToScreen(hint.targetX, hint.targetY);
    const fromCenter = { x: from.x + width / 2, y: from.y + height / 2 };
    const toCenter = { x: to.x + width / 2, y: to.y + height / 2 };

    ctx.save();
    ctx.lineCap = "round";
    ctx.strokeStyle = `rgba(119, 215, 166, ${0.16 + pulse * 0.12})`;
    ctx.lineWidth = Math.max(5, cellSize * 0.14);
    ctx.beginPath();
    ctx.moveTo(fromCenter.x, fromCenter.y);
    ctx.lineTo(toCenter.x, toCenter.y);
    ctx.stroke();

    const pad = cellSize * 0.1;
    const color = options.getVehicleColor(vehicle);
    ctx.globalAlpha = 0.28 + pulse * 0.14;
    ctx.fillStyle = color;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
    ctx.lineWidth = Math.max(1.5, cellSize * 0.022);
    roundedRect(ctx, to.x + pad, to.y + pad, width - pad * 2, height - pad * 2, vehicle.id === options.level.targetVehicleId ? 14 : 11);
    ctx.fill();
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.strokeStyle = `rgba(178, 212, 255, ${0.42 + pulse * 0.24})`;
    ctx.lineWidth = Math.max(1.5, cellSize * 0.024);
    roundedRect(ctx, to.x + pad * 0.65, to.y + pad * 0.65, width - pad * 1.3, height - pad * 1.3, vehicle.id === options.level.targetVehicleId ? 16 : 13);
    ctx.stroke();
    ctx.restore();
  }

  function drawHintLine(ctx, line, options, pulse) {
    const cellSize = options.cellSize;
    const boardPadX = options.boardPadX ?? options.boardPad;
    const boardPadY = options.boardPadY ?? options.boardPad;
    const x = boardPadX + line.fromX * cellSize;
    const y = boardPadY + line.y * cellSize + cellSize * 0.22;
    const width = Math.max(cellSize * 0.5, (line.toX - line.fromX) * cellSize);
    ctx.save();
    ctx.fillStyle = `rgba(119, 215, 166, ${0.14 + pulse * 0.1})`;
    roundedRect(ctx, x + 5, y, width - 10, cellSize * 0.56, 12);
    ctx.fill();
    ctx.restore();
  }

  function drawActorPath(ctx, actor, options, pulse) {
    if (actor.inactive || !actor.path || actor.path.length < 2) return;
    const exitPoint = options.getActorRouteExitPoint(actor);
    ctx.save();
    ctx.strokeStyle = `rgba(255, 138, 31, ${0.28 + pulse * 0.18})`;
    ctx.lineWidth = 5;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    actor.path.forEach((point, index) => {
      const pos = options.boardToScreen(point.x + 0.5, point.y + 0.5);
      if (index === 0) ctx.moveTo(pos.x, pos.y);
      else ctx.lineTo(pos.x, pos.y);
    });
    if (exitPoint) ctx.lineTo(exitPoint.x, exitPoint.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  function drawActorStepDot(ctx, actor, point, options, pulse) {
    const from = options.boardToScreen(actor.x + 0.5, actor.y + 0.5);
    const to = options.boardToScreen(point.x + 0.5, point.y + 0.5);
    const x = lerp(from.x, to.x, 0.55 + pulse * 0.2);
    const y = lerp(from.y, to.y, 0.55 + pulse * 0.2);
    ctx.save();
    ctx.fillStyle = "#ffcc4d";
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  function drawExit(ctx, options) {
    const cellSize = options.cellSize;
    const boardPad = options.boardPad;
    const boardPadX = options.boardPadX ?? boardPad;
    const boardPadY = options.boardPadY ?? boardPad;
    const level = options.level;
    const palette = getYardPalette(options);
    const theme = options.yardTheme || {};
    const env = getYardEnvironment(theme);
    const pulse = options.pulse || 0;
    if (usesFullArtBoard(theme, level)) return;
    const y = boardPadY + level.exit.row * cellSize;
    const x = boardPadX + level.width * cellSize;
    const roadHeight = cellSize * 0.74;
    const roadY = y + (cellSize - roadHeight) / 2;
    const outWidth = Math.max(20, Math.min(boardPad * 0.78, cellSize * 0.62));
    const curbHeight = Math.max(5, cellSize * 0.14);
    const curbColor = env === "forest_parking" ? "#c4bba0" : env === "winter_premium" ? "#dcecf4" : palette.curb;
    const curbShadow = env === "forest_parking" ? "rgba(34, 31, 20, 0.42)" : "rgba(0, 0, 0, 0.28)";
    const roadColor = env === "winter_premium" ? "rgba(42, 57, 70, 0.82)" : env === "forest_parking" ? "rgba(30, 34, 29, 0.9)" : "rgba(14, 18, 24, 0.78)";

    if (options.foregroundOnly) {
      // Поверх машины дорисовываем только торцы бордюров проезда,
      // чтобы выезд сохранял объем; предупреждающих полос здесь нет.
      ctx.save();
      ctx.fillStyle = curbColor;
      roundedRect(ctx, x - cellSize * 0.06, roadY - curbHeight * 1.45, cellSize * 0.12, curbHeight, 4);
      ctx.fill();
      roundedRect(ctx, x - cellSize * 0.06, roadY + roadHeight + curbHeight * 0.35, cellSize * 0.12, curbHeight, 4);
      ctx.fill();
      ctx.restore();
      return;
    }

    ctx.save();

    ctx.shadowColor = colorWithAlpha(palette.exitGlow, 0.08 + pulse * 0.16);
    ctx.shadowBlur = 10 + pulse * 12;
    ctx.fillStyle = colorWithAlpha(palette.exitGlow, 0.04 + pulse * 0.08);
    roundedRect(ctx, x - cellSize * 0.18, roadY - cellSize * 0.03, outWidth + cellSize * 0.28, roadHeight + cellSize * 0.06, 7);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.fillStyle = roadColor;
    roundedRect(ctx, x - cellSize * 0.16, roadY, outWidth + cellSize * 0.22, roadHeight, 5);
    ctx.fill();

    ctx.fillStyle = curbShadow;
    roundedRect(ctx, x - cellSize * 0.21, roadY - curbHeight * 1.2, outWidth + cellSize * 0.18, curbHeight * 0.8, 4);
    ctx.fill();
    roundedRect(ctx, x - cellSize * 0.21, roadY + roadHeight + curbHeight * 0.4, outWidth + cellSize * 0.18, curbHeight * 0.8, 4);
    ctx.fill();

    ctx.fillStyle = curbColor;
    roundedRect(ctx, x - cellSize * 0.22, roadY - curbHeight * 1.45, outWidth + cellSize * 0.08, curbHeight, 5);
    ctx.fill();
    roundedRect(ctx, x - cellSize * 0.22, roadY + roadHeight + curbHeight * 0.35, outWidth + cellSize * 0.08, curbHeight, 5);
    ctx.fill();

    if (env === "forest_parking") {
      ctx.fillStyle = palette.moss || "rgba(67, 110, 51, 0.45)";
      roundedRect(ctx, x - cellSize * 0.14, roadY - curbHeight * 1.63, outWidth * 0.42, curbHeight * 0.42, 999);
      ctx.fill();
      roundedRect(ctx, x + outWidth * 0.36, roadY + roadHeight + curbHeight * 0.92, outWidth * 0.36, curbHeight * 0.42, 999);
      ctx.fill();
      ctx.fillStyle = palette.leaf || "rgba(193, 119, 39, 0.72)";
      for (let i = 0; i < 4; i += 1) {
        ctx.save();
        ctx.translate(x - cellSize * 0.04 + i * outWidth * 0.18, roadY - curbHeight * (1.7 + (i % 2) * 0.15));
        ctx.rotate((i - 1.5) * 0.5);
        roundedRect(ctx, -cellSize * 0.025, -cellSize * 0.01, cellSize * 0.052, cellSize * 0.02, 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundedRect(ctx, x - cellSize * 0.12, roadY + roadHeight * 0.18, outWidth * 0.44, Math.max(1, cellSize * 0.035), 999);
    ctx.fill();

    // Осевая разметка проезда вместо предупреждающего блока
    ctx.strokeStyle = "rgba(255, 255, 255, 0.26)";
    ctx.lineWidth = Math.max(1.5, cellSize * 0.035);
    ctx.setLineDash([cellSize * 0.14, cellSize * 0.12]);
    ctx.beginPath();
    ctx.moveTo(x - cellSize * 0.1, roadY + roadHeight / 2);
    ctx.lineTo(x + outWidth + cellSize * 0.04, roadY + roadHeight / 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.strokeStyle = colorWithAlpha(palette.exitGlow, 0.18 + pulse * 0.22);
    ctx.lineWidth = Math.max(1, cellSize * 0.025);
    roundedRect(ctx, x - cellSize * 0.16, roadY, outWidth + cellSize * 0.22, roadHeight, 5);
    ctx.stroke();

    ctx.restore();
  }

  function drawWinFx(ctx, options) {
    const winFx = options.winFx;
    if (!winFx) return false;
    const progress = clamp((options.now - winFx.start) / winFx.duration, 0, 1);
    if (progress >= 1) return true;

    const cellSize = options.cellSize;
    const palette = getYardPalette(options);
    const boardPadX = options.boardPadX ?? options.boardPad;
    const boardPadY = options.boardPadY ?? options.boardPad;
    const x = boardPadX + options.level.width * cellSize;
    const y = boardPadY + options.level.exit.row * cellSize + cellSize / 2;
    ctx.save();
    ctx.strokeStyle = colorWithAlpha(palette.win, 1 - progress);
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(x, y, cellSize * (0.4 + progress * 1.25), 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = colorWithAlpha(palette.winCoin, 0.85 - progress * 0.55);
    for (let i = 0; i < 8; i += 1) {
      const angle = (Math.PI * 2 * i) / 8 + progress * 1.4;
      const distance = cellSize * (0.35 + progress * 1.15);
      ctx.beginPath();
      ctx.arc(x + Math.cos(angle) * distance, y + Math.sin(angle) * distance, Math.max(3, cellSize * 0.06), 0, Math.PI * 2);
      ctx.fill();
    }

    // Конфетти-вспышка: детерминированные разлетающиеся прямоугольники
    // с гравитацией, вращением и затуханием (без Math.random для повторяемости).
    const frac = (v) => v - Math.floor(v);
    const rand = (i, s) => frac(Math.sin((i + 1) * 12.9898 + s * 78.233) * 43758.5453);
    const confetti = [palette.win, palette.winCoin, "#85b8ff", "#f2828d", "#6fd9a8", "#ffd97e"];
    const fade = Math.max(0, 1 - progress * 1.05);
    for (let i = 0; i < 26; i += 1) {
      const angle = rand(i, 1) * Math.PI * 2;
      const speed = 0.8 + rand(i, 2) * 1.5;
      const dist = cellSize * speed * (0.6 + progress * 2.3);
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist + cellSize * progress * progress * 1.7;
      const size = cellSize * (0.05 + rand(i, 3) * 0.045);
      ctx.save();
      ctx.globalAlpha = fade;
      ctx.fillStyle = confetti[i % confetti.length];
      ctx.translate(px, py);
      ctx.rotate(angle + progress * (4 + rand(i, 1) * 4));
      ctx.fillRect(-size / 2, -size / 4, size, size / 2);
      ctx.restore();
    }
    ctx.restore();
    return false;
  }

  function drawMoveLimitWarning(ctx, options) {
    const remaining = options.remaining;
    if (remaining > 2 || remaining < 0) return;
    const intensity = remaining === 0 ? 0.22 : remaining === 1 ? 0.15 : 0.09;
    ctx.save();
    ctx.strokeStyle = `rgba(239, 64, 86, ${0.42 + intensity})`;
    ctx.lineWidth = remaining === 0 ? 8 : 5;
    roundedRect(ctx, 4, 4, options.width - 8, options.height - 8, 8);
    ctx.stroke();
    ctx.fillStyle = `rgba(239, 64, 86, ${intensity})`;
    ctx.fillRect(0, 0, options.width, options.boardPad * 0.8);
    ctx.fillRect(0, options.height - options.boardPad * 0.8, options.width, options.boardPad * 0.8);
    ctx.restore();
  }

  function drawVehicleThemeOverlay(ctx, options) {
    const theme = options.yardTheme || {};
    const palette = getYardPalette({ yardTheme: theme });
    const env = getYardEnvironment(theme);
    const { x, y, width, height, axis, cellSize } = options;

    ctx.save();
    ctx.lineCap = "round";

    if (env === "winter_premium") {
      const snowAlpha = options.isTarget ? 0.5 : 0.22;
      ctx.fillStyle = `rgba(248, 253, 255, ${snowAlpha})`;
      if (axis === "horizontal") {
        roundedRect(ctx, x + width * 0.18, y + height * 0.07, width * 0.46, Math.max(2, height * 0.09), Math.max(2, height * 0.05));
        ctx.fill();
        ctx.fillStyle = "rgba(180, 226, 255, 0.18)";
        roundedRect(ctx, x + width * 0.68, y + height * 0.14, width * 0.16, Math.max(2, height * 0.06), 3);
        ctx.fill();
      } else {
        roundedRect(ctx, x + width * 0.22, y + height * 0.08, width * 0.52, Math.max(2, height * 0.08), Math.max(2, width * 0.06));
        ctx.fill();
        ctx.fillStyle = "rgba(180, 226, 255, 0.16)";
        roundedRect(ctx, x + width * 0.2, y + height * 0.68, width * 0.54, Math.max(2, height * 0.06), 3);
        ctx.fill();
      }
    } else if (env === "winter") {
      ctx.fillStyle = "rgba(250, 253, 255, 0.82)";
      roundedRect(ctx, x + width * 0.16, y + height * 0.08, width * 0.58, Math.max(3, height * 0.15), Math.max(2, height * 0.06));
      ctx.fill();
      ctx.fillStyle = "rgba(235, 248, 255, 0.66)";
      roundedRect(ctx, x + width * 0.68, y + height * 0.16, width * 0.18, Math.max(2, height * 0.1), 3);
      ctx.fill();
    } else if (env === "rainy") {
      ctx.strokeStyle = "rgba(230, 250, 255, 0.42)";
      ctx.lineWidth = Math.max(1, cellSize * 0.018);
      ctx.beginPath();
      ctx.moveTo(x + width * 0.18, y + height * 0.22);
      ctx.lineTo(x + width * 0.82, y + height * 0.14);
      ctx.stroke();
      ctx.strokeStyle = "rgba(125, 187, 255, 0.24)";
      ctx.beginPath();
      ctx.moveTo(x + width * 0.12, y + height * 0.78);
      ctx.lineTo(x + width * 0.9, y + height * 0.72);
      ctx.stroke();
    } else if (env === "night") {
      ctx.fillStyle = palette.lampCore || "rgba(255, 218, 156, 0.28)";
      ctx.globalAlpha = 0.5;
      roundedRect(ctx, x + width * 0.12, y + height * 0.08, width * 0.28, Math.max(2, height * 0.08), 3);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (env === "underground") {
      ctx.fillStyle = "rgba(255, 245, 210, 0.28)";
      roundedRect(ctx, x + width * 0.22, y + height * 0.1, width * 0.48, Math.max(2, height * 0.07), 3);
      ctx.fill();
      ctx.strokeStyle = "rgba(225, 190, 85, 0.26)";
      ctx.lineWidth = Math.max(1, cellSize * 0.016);
      ctx.beginPath();
      if (axis === "horizontal") {
        ctx.moveTo(x + width * 0.16, y + height * 0.82);
        ctx.lineTo(x + width * 0.84, y + height * 0.82);
      } else {
        ctx.moveTo(x + width * 0.82, y + height * 0.16);
        ctx.lineTo(x + width * 0.82, y + height * 0.84);
      }
      ctx.stroke();
    } else if (env === "aged") {
      ctx.fillStyle = "rgba(37, 28, 18, 0.13)";
      for (let i = 0; i < 4; i += 1) {
        roundedRect(ctx, x + width * (0.18 + i * 0.16), y + height * (0.18 + (i % 2) * 0.42), width * 0.08, height * 0.08, 2);
        ctx.fill();
      }
    } else if (env === "forest_parking") {
      ctx.fillStyle = "rgba(71, 97, 46, 0.16)";
      roundedRect(ctx, x + width * 0.12, y + height * 0.12, width * 0.34, Math.max(2, height * 0.08), 4);
      ctx.fill();
      ctx.fillStyle = "rgba(181, 109, 34, 0.62)";
      const leaves = axis === "horizontal"
        ? [[0.22, 0.18, -0.35], [0.62, 0.72, 0.42], [0.78, 0.24, 0.12]]
        : [[0.28, 0.2, -0.25], [0.68, 0.55, 0.35], [0.34, 0.78, 0.1]];
      leaves.forEach(([lx, ly, angle]) => {
        ctx.save();
        ctx.translate(x + width * lx, y + height * ly);
        ctx.rotate(angle);
        roundedRect(ctx, -width * 0.025, -height * 0.01, width * 0.055, Math.max(2, height * 0.022), 3);
        ctx.fill();
        ctx.restore();
      });
      ctx.strokeStyle = "rgba(41, 58, 34, 0.2)";
      ctx.lineWidth = Math.max(1, cellSize * 0.014);
      ctx.beginPath();
      if (axis === "horizontal") {
        ctx.moveTo(x + width * 0.16, y + height * 0.78);
        ctx.lineTo(x + width * 0.82, y + height * 0.7);
      } else {
        ctx.moveTo(x + width * 0.78, y + height * 0.16);
        ctx.lineTo(x + width * 0.7, y + height * 0.84);
      }
      ctx.stroke();
    } else if (env === "neon") {
      ctx.strokeStyle = colorWithAlpha(palette.border, 0.55);
      ctx.lineWidth = Math.max(1, cellSize * 0.018);
      roundedRect(ctx, x + 2, y + 2, width - 4, height - 4, Math.max(4, cellSize * 0.1));
      ctx.stroke();
      ctx.fillStyle = colorWithAlpha(palette.exit, 0.22);
      roundedRect(ctx, x + width * 0.18, y + height * 0.78, width * 0.58, Math.max(2, height * 0.08), 3);
      ctx.fill();
    } else if (env === "holiday") {
      const lights = [palette.winCoin || "#ffd166", palette.exit || "#70d59c", "#ff7a86"];
      for (let i = 0; i < 3; i += 1) {
        ctx.fillStyle = lights[i % lights.length];
        ctx.beginPath();
        ctx.arc(x + width * (0.26 + i * 0.22), y + height * 0.16, Math.max(1.6, cellSize * 0.025), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }

  function drawPreviewVehicle(ctx, options) {
    const { x, y, width, height, color, yardTheme, axis, isTarget, cellSize } = options;
    const vehicle = {
      axis,
      length: options.length || (axis === "horizontal" ? Math.max(2, Math.round(width / cellSize)) : Math.max(2, Math.round(height / cellSize)))
    };

    if (!isTarget) {
      const bodyPad = cellSize * 0.12;
      const spritePad = cellSize * 0.02;
      const spriteX = x - bodyPad + spritePad;
      const spriteY = y - bodyPad + spritePad;
      const spriteWidth = width + bodyPad * 2 - spritePad * 2;
      const spriteHeight = height + bodyPad * 2 - spritePad * 2;
      if (drawYardTrafficSprite(ctx, {
        vehicle,
        x: spriteX,
        y: spriteY,
        width: spriteWidth,
        height: spriteHeight,
        axis,
        cellSize,
        yardTheme,
        paintColor: color
      })) return;
    }

    ctx.save();
    const gradient = axis === "horizontal" ? ctx.createLinearGradient(x, y, x, y + height) : ctx.createLinearGradient(x, y, x + width, y);
    gradient.addColorStop(0, lighten(color, 0.24));
    gradient.addColorStop(0.55, color);
    gradient.addColorStop(1, darken(color, 0.22));
    ctx.fillStyle = gradient;
    roundedRect(ctx, x, y, width, height, isTarget ? 7 : 6);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    if (axis === "horizontal") {
      roundedRect(ctx, x + width * 0.18, y + height * 0.18, width * 0.24, height * 0.22, 4);
      ctx.fill();
      roundedRect(ctx, x + width * 0.54, y + height * 0.18, width * 0.22, height * 0.22, 4);
      ctx.fill();
    } else {
      roundedRect(ctx, x + width * 0.24, y + height * 0.16, width * 0.42, height * 0.22, 4);
      ctx.fill();
      roundedRect(ctx, x + width * 0.24, y + height * 0.58, width * 0.42, height * 0.22, 4);
      ctx.fill();
    }
    ctx.fillStyle = "rgba(12,15,20,0.7)";
    roundedRect(ctx, x + width * 0.16, y + height * 0.82, width * 0.13, Math.max(2, height * 0.08), 2);
    roundedRect(ctx, x + width * 0.72, y + height * 0.82, width * 0.13, Math.max(2, height * 0.08), 2);
    ctx.fill();
    ctx.restore();

    drawVehicleThemeOverlay(ctx, { x, y, width, height, axis, cellSize, yardTheme });
  }

  function renderYardPreview(canvas, yardTheme) {
    const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    if (!ctx) return;
    const cssWidth = canvas.clientWidth || 128;
    const cssHeight = canvas.clientHeight || 88;
    const ratio = Math.min(2, (typeof window !== "undefined" && window.devicePixelRatio) || 1);
    const pixelWidth = Math.max(1, Math.round(cssWidth * ratio));
    const pixelHeight = Math.max(1, Math.round(cssHeight * ratio));
    if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
      canvas.width = pixelWidth;
      canvas.height = pixelHeight;
    }
    ctx.save();
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    const level = { id: `preview_${yardTheme.id || "yard"}`, width: 6, height: 6, exit: { row: 2 }, targetVehicleId: "target" };
    const fullBoardPreview = usesFullArtBoard(yardTheme, level);
    const previewSize = Math.min(cssWidth, cssHeight);
    const frame = fullBoardPreview && yardTheme.gridFrame ? yardTheme.gridFrame : null;
    const boardPadX = frame ? Math.max(0, Math.round(previewSize * frame.left / 1024)) : 9;
    const boardPadY = frame ? Math.max(0, Math.round(previewSize * frame.top / 1024)) : boardPadX;
    const cellSize = frame
      ? Math.floor(Math.min(
        previewSize * ((frame.right - frame.left) / 1024) / 6,
        previewSize * ((frame.bottom - frame.top) / 1024) / 6
      ))
      : Math.floor(Math.min((cssWidth - boardPadX * 2) / 6, (cssHeight - boardPadX * 2) / 6));
    const boardPixelSize = frame ? previewSize : cellSize * 6 + boardPadX * 2;
    const offsetX = Math.max(0, (cssWidth - boardPixelSize) / 2);
    const offsetY = fullBoardPreview ? Math.max(0, (cssHeight - boardPixelSize) / 2) : 0;
    ctx.translate(offsetX, offsetY);
    drawYard(ctx, {
      level,
      cellSize,
      boardPad: boardPadX,
      width: boardPixelSize,
      height: fullBoardPreview ? boardPixelSize : cssHeight,
      yardTheme
    });

    const toScreen = (gridX, gridY) => ({ x: boardPadX + gridX * cellSize, y: boardPadY + gridY * cellSize });

    const pad = cellSize * 0.12;
    const drawCar = (vehicle) => {
      const pos = toScreen(vehicle.x, vehicle.y);
      const width = (vehicle.axis === "horizontal" ? vehicle.length : 1) * cellSize - pad * 2;
      const height = (vehicle.axis === "vertical" ? vehicle.length : 1) * cellSize - pad * 2;
      drawPreviewVehicle(ctx, {
        x: pos.x + pad,
        y: pos.y + pad,
        width,
        height,
        length: vehicle.length,
        axis: vehicle.axis,
        color: vehicle.color,
        isTarget: vehicle.id === "target",
        yardTheme,
        cellSize
      });
    };
    // Чистая, одинаковая для всех дворов композиция: красная цель в центре +
    // две машины-блокировщика. Без препятствий — тамбнейл читается аккуратно.
    [
      { id: "side_a", x: 0, y: 0, length: 2, axis: "vertical", color: "#66b6ff" },
      { id: "target", x: 2, y: 2, length: 2, axis: "horizontal", color: "#ef5364" },
      { id: "side_b", x: 3, y: 4, length: 2, axis: "horizontal", color: "#f0bd5a" }
    ].forEach(drawCar);

    // Единый для всех дворов оверлей — верхний блик + мягкая виньетка.
    // Делает разнородные арты дворов цельной коллекцией.
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    const sheen = ctx.createLinearGradient(0, 0, 0, cssHeight);
    sheen.addColorStop(0, "rgba(255, 255, 255, 0.1)");
    sheen.addColorStop(0.2, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = sheen;
    ctx.fillRect(0, 0, cssWidth, cssHeight);
    const vignette = ctx.createRadialGradient(
      cssWidth / 2, cssHeight * 0.44, cssHeight * 0.18,
      cssWidth / 2, cssHeight * 0.56, cssHeight * 0.96
    );
    vignette.addColorStop(0, "rgba(0, 0, 0, 0)");
    vignette.addColorStop(1, "rgba(0, 0, 0, 0.36)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, cssWidth, cssHeight);

    ctx.restore();
  }

  function isCanvasNonBlank(canvas) {
    const ctx = canvas && canvas.getContext ? canvas.getContext("2d") : null;
    if (!ctx) return false;
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    for (let i = 3; i < data.length; i += 64) {
      if (data[i] > 0) return true;
    }
    return false;
  }

  window.PROBKA_RENDERER = {
    clamp,
    lerp,
    easeOutCubic,
    roundedRect,
    hashStable,
    lighten,
    darken,
    getVehicleKind,
    getVehicleBodyRadius,
    loadSkinSprites,
    loadYardAssets,
    hasSkinSprite,
    hasYardTrafficSprite,
    getSkinSpriteDrawRect,
    drawSkinSprite,
    drawYardTrafficSprite,
    renderSkinSpritePreview,
    drawTrafficVehicleDetails,
    drawTargetVehicleDetails,
    drawYard,
    drawObstacle,
    drawVehicleThemeOverlay,
    renderYardPreview,
    drawActor,
    drawActorRoutes,
    drawMoveGuide,
    drawHint,
    drawTutorialHint,
    drawExit,
    drawWinFx,
    drawMoveLimitWarning,
    isCanvasNonBlank
  };
})();
