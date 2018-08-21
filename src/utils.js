const validateFEN = (fen) => {
  for (let num=1; num<=8; num++) {
    fen = fen.replace(RegExp(num, 'g'), '-'.repeat(num));
  }
  fen = fen.split('/').map(item=>item.split(''));
  return fen.length === 8 && fen.every((item)=>item.length === 8);
}

export { validateFEN };
