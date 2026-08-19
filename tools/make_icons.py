#!/usr/bin/env python3
"""Generate the extension icon set as PNGs.

Build-time only: run it to regenerate icons/*.png after changing PALETTE or the
bar layout. The extension itself ships the rendered PNGs and never runs this.

    python3 tools/make_icons.py
"""

import os
import struct
import zlib

PAPER = (244, 240, 230, 255)
INK = (10, 10, 10, 255)
CLEAR = (0, 0, 0, 0)

CORNER_RADIUS = 0.18
SUPERSAMPLE = 4

# (x0, x1, y0, y1) in 0..1 canvas space. Small sizes drop to two bars so the
# gaps survive rasterisation; three bars mush into grey below ~32px.
BARS_LARGE = [
    (0.14, 0.86, 0.21, 0.34),
    (0.14, 0.62, 0.43, 0.56),
    (0.14, 0.78, 0.65, 0.78),
]
BARS_SMALL = [
    (0.14, 0.86, 0.28, 0.46),
    (0.14, 0.64, 0.56, 0.74),
]

SIZES = [16, 32, 48, 128]


def in_rounded_rect(x, y, radius):
    if radius <= 0:
        return 0.0 <= x <= 1.0 and 0.0 <= y <= 1.0
    if not (0.0 <= x <= 1.0 and 0.0 <= y <= 1.0):
        return False
    cx = min(max(x, radius), 1.0 - radius)
    cy = min(max(y, radius), 1.0 - radius)
    dx, dy = x - cx, y - cy
    return dx * dx + dy * dy <= radius * radius


def in_bars(x, y, bars):
    for x0, x1, y0, y1 in bars:
        if x0 <= x <= x1 and y0 <= y <= y1:
            return True
    return False


def sample(x, y, bars):
    if not in_rounded_rect(x, y, CORNER_RADIUS):
        return CLEAR
    if in_bars(x, y, bars):
        return INK
    return PAPER


def render(size):
    bars = BARS_LARGE if size >= 48 else BARS_SMALL
    ss = SUPERSAMPLE
    total = ss * ss
    rows = []
    for py in range(size):
        row = []
        for px in range(size):
            # Average in premultiplied space, otherwise the paper/transparent
            # edge picks up a dark halo.
            ar = ag = ab = aa = 0
            for sy in range(ss):
                for sx in range(ss):
                    x = (px + (sx + 0.5) / ss) / size
                    y = (py + (sy + 0.5) / ss) / size
                    r, g, b, a = sample(x, y, bars)
                    ar += r * a
                    ag += g * a
                    ab += b * a
                    aa += a
            if aa == 0:
                row.append((0, 0, 0, 0))
            else:
                row.append((
                    round(ar / aa),
                    round(ag / aa),
                    round(ab / aa),
                    round(aa / total),
                ))
        rows.append(row)
    return rows


def write_png(path, rows):
    height = len(rows)
    width = len(rows[0])
    raw = bytearray()
    for row in rows:
        raw.append(0)
        for r, g, b, a in row:
            raw += bytes((r, g, b, a))

    def chunk(tag, data):
        body = tag + data
        return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)

    png = b"\x89PNG\r\n\x1a\n"
    png += chunk(b"IHDR", struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0))
    png += chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    png += chunk(b"IEND", b"")
    with open(path, "wb") as fh:
        fh.write(png)


def main():
    out = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "icons")
    os.makedirs(out, exist_ok=True)
    for size in SIZES:
        path = os.path.join(out, "icon%d.png" % size)
        write_png(path, render(size))
        print("wrote %s (%d bytes)" % (path, os.path.getsize(path)))


if __name__ == "__main__":
    main()
