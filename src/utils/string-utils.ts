export const parseList = (listString: string | undefined) => listString?.split(',').map((item) => item.trim());
