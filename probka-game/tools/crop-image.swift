#!/usr/bin/env swift
import AppKit
import Foundation

func fail(_ message: String) -> Never {
  FileHandle.standardError.write((message + "\n").data(using: .utf8)!)
  exit(1)
}

let args = CommandLine.arguments
guard args.count == 9 else {
  fail("usage: crop-image.swift <source> <out> <x> <y> <w> <h> <outW> <outH>")
}

let source = args[1]
let out = args[2]
guard
  let x = Int(args[3]),
  let y = Int(args[4]),
  let w = Int(args[5]),
  let h = Int(args[6]),
  let outW = Int(args[7]),
  let outH = Int(args[8])
else {
  fail("invalid numeric argument")
}

guard let image = NSImage(contentsOfFile: source) else {
  fail("cannot load \(source)")
}

var imageRect = NSRect(origin: .zero, size: image.size)
guard let cgImage = image.cgImage(forProposedRect: &imageRect, context: nil, hints: nil) else {
  fail("cannot create CGImage")
}

let cropRect = CGRect(x: x, y: y, width: w, height: h)
guard let cropped = cgImage.cropping(to: cropRect) else {
  fail("cannot crop \(cropRect)")
}

let canvas = NSImage(size: NSSize(width: outW, height: outH))
canvas.lockFocus()
NSGraphicsContext.current?.imageInterpolation = .high
NSColor.clear.setFill()
NSRect(x: 0, y: 0, width: outW, height: outH).fill()
NSImage(cgImage: cropped, size: NSSize(width: w, height: h)).draw(
  in: NSRect(x: 0, y: 0, width: outW, height: outH),
  from: NSRect(x: 0, y: 0, width: w, height: h),
  operation: .sourceOver,
  fraction: 1
)
canvas.unlockFocus()

guard let tiff = canvas.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let png = rep.representation(using: .png, properties: [:]) else {
  fail("cannot encode PNG")
}

let outURL = URL(fileURLWithPath: out)
try FileManager.default.createDirectory(at: outURL.deletingLastPathComponent(), withIntermediateDirectories: true)
try png.write(to: outURL)
print("\(outW)x\(outH) \(out)")
