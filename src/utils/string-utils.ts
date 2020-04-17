export function parseList(listString: string): string[];
export function parseList(listString: string | undefined): string[] | undefined;

export function parseList(listString: string | undefined) {
  return listString?.split(',').map((item) => item.trim());
}
