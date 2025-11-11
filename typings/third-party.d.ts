declare module 'file-saver' {
  export function saveAs(data: any, filename?: string): void;
  export default saveAs;
}
declare module 'xlsx' {
  const XLSX: any;
  export default XLSX;
}
declare module 'jspdf' {
  export class jsPDF {
    constructor(opts?: any);
    text(text: string, x: number, y: number): void;
    addPage(): void;
    save(filename: string): void;
    setFontSize(size: number): void;
  }
  export default jsPDF;
}
