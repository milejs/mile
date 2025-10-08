type SPEC = {
  readonly radix: number;
  readonly unit: string[];
};

const si = { radix: 1e3, unit: ["b", "kb", "Mb", "Gb", "Tb", "Pb", "Eb", "Zb", "Yb"] };
const iec = { radix: 1024, unit: ["b", "Kib", "Mib", "Gib", "Tib", "Pib", "Eib", "Zib", "Yib"] };
const jedec = { radix: 1024, unit: ["b", "Kb", "Mb", "Gb", "Tb", "Pb", "Eb", "Zb", "Yb"] };

const SPECS: Record<string, SPEC> = {
  si,
  iec,
  jedec,
};

/**
 * file size
 * @param bytes
 * @param fixed
 * @param spec
 */
export function filesize(bytes: number, fixed = 1, spec?: string): string {
  bytes = Math.abs(bytes);

  // @ts-expect-error
  const { radix, unit } = SPECS[spec] || SPECS.jedec;

  let loop = 0;

  // calculate
  while (bytes >= radix) {
    bytes /= radix;
    ++loop;
  }
  return `${bytes.toFixed(fixed)} ${unit[loop]}`;
}
