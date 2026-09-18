/** dossier numéroté 0.png … (n-1).png → liste d'urls */
export const numberedFrames = (dir: string, count: number) =>
  Array.from({ length: count }, (_, i) => `${dir}/${i}.png`)
