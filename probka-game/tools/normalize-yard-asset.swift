#!/usr/bin/env swift

import Foundation
import CoreGraphics
import ImageIO

#if canImport(UniformTypeIdentifiers)
import UniformTypeIdentifiers
#endif

struct RGBAImage {
    let width: Int
    let height: Int
    var pixels: [UInt8]
}

enum ToolError: Error, CustomStringConvertible {
    case usage
    case loadFailed(String)
    case writeFailed(String)
    case invalidNumber(String)
    case emptySprite

    var description: String {
        switch self {
        case .usage:
            return "Usage: normalize-yard-asset sprite <input> <output> <width> <height> <scale> | board <input> <output> <width> <height>"
        case .loadFailed(let path):
            return "Failed to load image: \(path)"
        case .writeFailed(let path):
            return "Failed to write image: \(path)"
        case .invalidNumber(let value):
            return "Invalid number: \(value)"
        case .emptySprite:
            return "Sprite has no visible pixels after chroma removal"
        }
    }
}

func intArg(_ value: String) throws -> Int {
    guard let parsed = Int(value) else { throw ToolError.invalidNumber(value) }
    return parsed
}

func doubleArg(_ value: String) throws -> Double {
    guard let parsed = Double(value) else { throw ToolError.invalidNumber(value) }
    return parsed
}

func clamp(_ value: Double) -> UInt8 {
    return UInt8(max(0, min(255, Int(value.rounded()))))
}

func loadRGBA(_ path: String) throws -> RGBAImage {
    let url = URL(fileURLWithPath: path)
    guard
        let source = CGImageSourceCreateWithURL(url as CFURL, nil),
        let image = CGImageSourceCreateImageAtIndex(source, 0, nil)
    else {
        throw ToolError.loadFailed(path)
    }

    let width = image.width
    let height = image.height
    var pixels = [UInt8](repeating: 0, count: width * height * 4)
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue
    guard let context = CGContext(
        data: &pixels,
        width: width,
        height: height,
        bitsPerComponent: 8,
        bytesPerRow: width * 4,
        space: colorSpace,
        bitmapInfo: bitmapInfo
    ) else {
        throw ToolError.loadFailed(path)
    }
    context.interpolationQuality = .high
    context.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
    return RGBAImage(width: width, height: height, pixels: pixels)
}

func writeRGBA(_ image: RGBAImage, _ path: String) throws {
    var pixels = image.pixels
    for index in stride(from: 0, to: pixels.count, by: 4) {
        let alpha = Double(pixels[index + 3]) / 255.0
        if alpha <= 0 {
            pixels[index] = 0
            pixels[index + 1] = 0
            pixels[index + 2] = 0
        } else if alpha < 1 {
            pixels[index] = clamp(Double(pixels[index]) * alpha)
            pixels[index + 1] = clamp(Double(pixels[index + 1]) * alpha)
            pixels[index + 2] = clamp(Double(pixels[index + 2]) * alpha)
        }
    }

    let data = Data(pixels)
    guard let provider = CGDataProvider(data: data as CFData) else {
        throw ToolError.writeFailed(path)
    }
    let colorSpace = CGColorSpaceCreateDeviceRGB()
    let bitmapInfo = CGBitmapInfo(rawValue: CGImageAlphaInfo.premultipliedLast.rawValue | CGBitmapInfo.byteOrder32Big.rawValue)
    guard let cgImage = CGImage(
        width: image.width,
        height: image.height,
        bitsPerComponent: 8,
        bitsPerPixel: 32,
        bytesPerRow: image.width * 4,
        space: colorSpace,
        bitmapInfo: bitmapInfo,
        provider: provider,
        decode: nil,
        shouldInterpolate: true,
        intent: .defaultIntent
    ) else {
        throw ToolError.writeFailed(path)
    }

    let url = URL(fileURLWithPath: path)
    try FileManager.default.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
    #if canImport(UniformTypeIdentifiers)
    let pngType = UTType.png.identifier as CFString
    #else
    let pngType = "public.png" as CFString
    #endif
    guard let destination = CGImageDestinationCreateWithURL(url as CFURL, pngType, 1, nil) else {
        throw ToolError.writeFailed(path)
    }
    CGImageDestinationAddImage(destination, cgImage, nil)
    if !CGImageDestinationFinalize(destination) {
        throw ToolError.writeFailed(path)
    }
}

func resize(_ source: RGBAImage, width: Int, height: Int) -> RGBAImage {
    var output = [UInt8](repeating: 0, count: width * height * 4)
    let sw = source.width
    let sh = source.height

    for y in 0..<height {
        let sy = max(0.0, min(Double(sh - 1), (Double(y) + 0.5) * Double(sh) / Double(height) - 0.5))
        let y0 = Int(floor(sy))
        let y1 = min(sh - 1, y0 + 1)
        let ty = sy - Double(y0)
        for x in 0..<width {
            let sx = max(0.0, min(Double(sw - 1), (Double(x) + 0.5) * Double(sw) / Double(width) - 0.5))
            let x0 = Int(floor(sx))
            let x1 = min(sw - 1, x0 + 1)
            let tx = sx - Double(x0)
            let i00 = (y0 * sw + x0) * 4
            let i10 = (y0 * sw + x1) * 4
            let i01 = (y1 * sw + x0) * 4
            let i11 = (y1 * sw + x1) * 4
            let dst = (y * width + x) * 4
            for c in 0..<4 {
                let top = Double(source.pixels[i00 + c]) * (1 - tx) + Double(source.pixels[i10 + c]) * tx
                let bottom = Double(source.pixels[i01 + c]) * (1 - tx) + Double(source.pixels[i11 + c]) * tx
                output[dst + c] = clamp(top * (1 - ty) + bottom * ty)
            }
        }
    }
    return RGBAImage(width: width, height: height, pixels: output)
}

func crop(_ source: RGBAImage, x: Int, y: Int, width: Int, height: Int) -> RGBAImage {
    var output = [UInt8](repeating: 0, count: width * height * 4)
    for py in 0..<height {
        for px in 0..<width {
            let sx = x + px
            let sy = y + py
            if sx < 0 || sy < 0 || sx >= source.width || sy >= source.height { continue }
            let src = (sy * source.width + sx) * 4
            let dst = (py * width + px) * 4
            output[dst] = source.pixels[src]
            output[dst + 1] = source.pixels[src + 1]
            output[dst + 2] = source.pixels[src + 2]
            output[dst + 3] = source.pixels[src + 3]
        }
    }
    return RGBAImage(width: width, height: height, pixels: output)
}

func resizeCover(_ source: RGBAImage, width: Int, height: Int) -> RGBAImage {
    let ratio = max(Double(width) / Double(source.width), Double(height) / Double(source.height))
    let scaledWidth = max(1, Int((Double(source.width) * ratio).rounded()))
    let scaledHeight = max(1, Int((Double(source.height) * ratio).rounded()))
    let scaled = resize(source, width: scaledWidth, height: scaledHeight)
    return crop(scaled, x: max(0, (scaledWidth - width) / 2), y: max(0, (scaledHeight - height) / 2), width: width, height: height)
}

func detectChromaKey(_ source: RGBAImage) -> (r: Double, g: Double, b: Double, isMagenta: Bool) {
    let margin = max(2, min(source.width, source.height) / 24)
    let stepX = max(1, source.width / 64)
    let stepY = max(1, source.height / 64)
    var r = 0.0
    var g = 0.0
    var b = 0.0
    var count = 0.0

    func add(_ x: Int, _ y: Int) {
        let index = (y * source.width + x) * 4
        r += Double(source.pixels[index])
        g += Double(source.pixels[index + 1])
        b += Double(source.pixels[index + 2])
        count += 1
    }

    for y in 0..<margin {
        stride(from: 0, to: source.width, by: stepX).forEach { add($0, y) }
    }
    for y in max(0, source.height - margin)..<source.height {
        stride(from: 0, to: source.width, by: stepX).forEach { add($0, y) }
    }
    for x in 0..<margin {
        stride(from: 0, to: source.height, by: stepY).forEach { add(x, $0) }
    }
    for x in max(0, source.width - margin)..<source.width {
        stride(from: 0, to: source.height, by: stepY).forEach { add(x, $0) }
    }

    r /= max(1, count)
    g /= max(1, count)
    b /= max(1, count)
    let magentaScore = r + b - g * 1.8
    let greenScore = g * 1.6 - r - b
    return magentaScore > greenScore ? (255, 0, 255, true) : (0, 255, 0, false)
}

func removeChroma(_ source: RGBAImage) -> RGBAImage {
    let key = detectChromaKey(source)
    var output = source

    for index in stride(from: 0, to: output.pixels.count, by: 4) {
        var r = Double(output.pixels[index])
        var g = Double(output.pixels[index + 1])
        var b = Double(output.pixels[index + 2])
        let originalAlpha = Double(output.pixels[index + 3]) / 255.0
        let dr = r - key.r
        let dg = g - key.g
        let db = b - key.b
        let distance = sqrt(dr * dr + dg * dg + db * db)

        var alpha: Double
        if distance <= 34 {
            alpha = 0
        } else if distance >= 138 {
            alpha = 1
        } else {
            let t = (distance - 34) / (138 - 34)
            alpha = pow(max(0, min(1, t)), 1.35)
        }
        alpha *= originalAlpha

        if key.isMagenta {
            let likelyMagenta = r > 130 && b > 130 && g < 125
            if likelyMagenta {
                if alpha < 0.92 {
                    alpha = 0
                } else {
                    g = max(g, 112)
                    r = min(r, g + 28)
                    b = min(b, g + 34)
                }
            }
        } else {
            let likelyGreen = g > 150 && r < 125 && b < 130
            if likelyGreen {
                if alpha < 0.92 {
                    alpha = 0
                } else {
                    r = max(r, 112)
                    b = max(b, 108)
                    g = min(g, max(r, b) + 34)
                }
            }
        }

        if alpha <= 0.03 {
            output.pixels[index] = 0
            output.pixels[index + 1] = 0
            output.pixels[index + 2] = 0
            output.pixels[index + 3] = 0
        } else {
            output.pixels[index] = clamp(r)
            output.pixels[index + 1] = clamp(g)
            output.pixels[index + 2] = clamp(b)
            output.pixels[index + 3] = clamp(alpha * 255)
        }
    }
    return output
}

func alphaBounds(_ source: RGBAImage, minAlpha: UInt8 = 12) -> (x0: Int, y0: Int, x1: Int, y1: Int)? {
    var x0 = source.width
    var y0 = source.height
    var x1 = -1
    var y1 = -1
    for y in 0..<source.height {
        for x in 0..<source.width {
            let alpha = source.pixels[(y * source.width + x) * 4 + 3]
            if alpha >= minAlpha {
                x0 = min(x0, x)
                y0 = min(y0, y)
                x1 = max(x1, x)
                y1 = max(y1, y)
            }
        }
    }
    if x1 < x0 { return nil }
    return (x0, y0, x1, y1)
}

func fitSprite(_ source: RGBAImage, width: Int, height: Int, scale: Double) throws -> RGBAImage {
    let keyed = removeChroma(source)
    guard let bounds = alphaBounds(keyed) else { throw ToolError.emptySprite }
    let padding = 16
    let x0 = max(0, bounds.x0 - padding)
    let y0 = max(0, bounds.y0 - padding)
    let x1 = min(keyed.width - 1, bounds.x1 + padding)
    let y1 = min(keyed.height - 1, bounds.y1 + padding)
    let cropped = crop(keyed, x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1)
    let targetWidth = max(1, Int((Double(width) * scale).rounded()))
    let targetHeight = max(1, Int((Double(height) * scale).rounded()))
    let targetAspect = Double(width) / Double(height)
    let isVehicleSlot = targetAspect >= 1.8 || targetAspect <= 0.56
    let fittedWidth: Int
    let fittedHeight: Int
    let fitted: RGBAImage
    if isVehicleSlot {
        fittedWidth = targetWidth
        fittedHeight = targetHeight
        fitted = resize(cropped, width: fittedWidth, height: fittedHeight)
    } else {
        let ratio = min(Double(targetWidth) / Double(cropped.width), Double(targetHeight) / Double(cropped.height))
        fittedWidth = max(1, Int((Double(cropped.width) * ratio).rounded()))
        fittedHeight = max(1, Int((Double(cropped.height) * ratio).rounded()))
        fitted = resize(cropped, width: fittedWidth, height: fittedHeight)
    }

    var output = RGBAImage(width: width, height: height, pixels: [UInt8](repeating: 0, count: width * height * 4))
    let offsetX = (width - fittedWidth) / 2
    let offsetY = (height - fittedHeight) / 2
    for y in 0..<fittedHeight {
        for x in 0..<fittedWidth {
            let src = (y * fittedWidth + x) * 4
            let dst = ((offsetY + y) * width + offsetX + x) * 4
            output.pixels[dst] = fitted.pixels[src]
            output.pixels[dst + 1] = fitted.pixels[src + 1]
            output.pixels[dst + 2] = fitted.pixels[src + 2]
            output.pixels[dst + 3] = fitted.pixels[src + 3]
        }
    }
    return output
}

func run() throws {
    let args = Array(CommandLine.arguments.dropFirst())
    guard args.count >= 1 else { throw ToolError.usage }
    let mode = args[0]
    if mode == "sprite" {
        guard args.count == 6 else { throw ToolError.usage }
        let input = args[1]
        let output = args[2]
        let width = try intArg(args[3])
        let height = try intArg(args[4])
        let scale = try doubleArg(args[5])
        try writeRGBA(try fitSprite(loadRGBA(input), width: width, height: height, scale: scale), output)
    } else if mode == "board" {
        guard args.count == 5 else { throw ToolError.usage }
        let input = args[1]
        let output = args[2]
        let width = try intArg(args[3])
        let height = try intArg(args[4])
        try writeRGBA(resizeCover(try loadRGBA(input), width: width, height: height), output)
    } else {
        throw ToolError.usage
    }
}

do {
    try run()
} catch {
    fputs("\(error)\n", stderr)
    exit(1)
}
