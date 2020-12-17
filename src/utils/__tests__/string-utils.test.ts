import { StringUtils } from '../string-utils';

describe('StringUtils', () => {
  describe('parseList', () => {
    // Typing check for (undefined) => undefined.
    it('should return undefined if the input is undefined', () => {
      expect<undefined>(StringUtils.parseList(undefined)).toBeUndefined();
    });

    // Typing check for (string) => string[].
    it('should return an array with an empty string if the input is an empty string', () => {
      expect<string[]>(StringUtils.parseList('')).toStrictEqual(['']);
    });

    // Typing check for (string | undefined) => string[] | undefined.
    it('should return an array with two empty strings if the input is a comma', () => {
      let output = StringUtils.parseList(',' as string | undefined);
      expect(output).toStrictEqual(['', '']);

      output = undefined;
      output = [''];
    });

    it('should return an array with a single element containing the input if the input does not contain a comma', () => {
      expect(StringUtils.parseList('abc')).toStrictEqual(['abc']);
    });

    it('should return an array with two elements if the input contains a comma', () => {
      expect(StringUtils.parseList('abc,def')).toStrictEqual(['abc', 'def']);
    });

    it('should return an array with trimmed elements if the input contains spaces', () => {
      expect(StringUtils.parseList(' ab c , def ')).toStrictEqual(['ab c', 'def']);
    });
  });
});
