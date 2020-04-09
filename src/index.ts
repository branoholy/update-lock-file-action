export const main = (_args: string[]) => {
  console.log('Hello World!');

  return 0;
};

process.exit(main(process.argv.slice(2)));
