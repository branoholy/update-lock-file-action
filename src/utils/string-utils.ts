function parseList(listString: undefined): undefined;
function parseList(listString: string): string[];
function parseList(listString: string | undefined): string[] | undefined;

function parseList(listString: string | undefined): string[] | undefined {
  return listString?.split(',').map((item) => item.trim());
}

export const StringUtils = {
  parseList
};
