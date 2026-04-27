// utils/colorDesaturator.ts

class ColorDesaturator {
  private saturationReduction: number;

  constructor(saturationReduction: number = 0.3) {
    this.saturationReduction = saturationReduction;
  }

  private rgbToHsl(r: number, g: number, b: number): [number, number, number] {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h: number, s: number;
    const l = (max + min) / 2;

    if (max === min) {
      h = s = 0;
    } else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = (g - b) / d + (g < b ? 6 : 0);
          break;
        case g:
          h = (b - r) / d + 2;
          break;
        case b:
          h = (r - g) / d + 4;
          break;
        default:
          h = 0;
      }
      h /= 6;
    }

    return [h, s, l];
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };

    let r: number, g: number, b: number;
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }

    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }

  private desaturateColor(colorString: string): string {
    // Handle rgba format
    const rgbaMatch = colorString.match(
      /rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/,
    );
    if (rgbaMatch) {
      const [, r, g, b, a] = rgbaMatch;
      const [h, s, l] = this.rgbToHsl(parseInt(r), parseInt(g), parseInt(b));
      const newS = Math.max(0, s * (1 - this.saturationReduction));
      const [newR, newG, newB] = this.hslToRgb(h, newS, l);

      return a !== undefined
        ? `rgba(${newR}, ${newG}, ${newB}, ${a})`
        : `rgb(${newR}, ${newG}, ${newB})`;
    }

    // Handle hex format
    const hexMatch = colorString.match(/^#([0-9a-fA-F]{6})$/);
    if (hexMatch) {
      const hex = hexMatch[1];
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);

      const [h, s, l] = this.rgbToHsl(r, g, b);
      const newS = Math.max(0, s * (1 - this.saturationReduction));
      const [newR, newG, newB] = this.hslToRgb(h, newS, l);

      const toHex = (n: number): string => n.toString(16).padStart(2, "0");
      return `#${toHex(newR)}${toHex(newG)}${toHex(newB)}`;
    }

    return colorString;
  }

  private processValue(value: any): any {
    if (typeof value === "string") {
      return this.desaturateColor(value);
    }

    if (Array.isArray(value)) {
      return value.map((item) => this.processValue(item));
    }

    if (value && typeof value === "object") {
      const result: Record<string, any> = {};
      for (const [key, val] of Object.entries(value)) {
        result[key] = this.processValue(val);
      }
      return result;
    }

    return value;
  }

  public desaturateStyle(styleObject: any): any {
    return this.processValue(styleObject);
  }
}

export function processMapLibreStyle(
  styleJson: any,
  saturationReduction: number = 0.3,
): any {
  const desaturator = new ColorDesaturator(saturationReduction);
  return desaturator.desaturateStyle(styleJson);
}
