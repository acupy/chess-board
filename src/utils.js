const validateFEN = (fen) => {
    // TODO:: Only enfoces ranks
    const regEx = '^([rnbqkpRNBQKP1-8]{1,8}/){7}([rnbqkpRNBQKP1-8]{1,8})$';
    return fen.match(regEx);
}

export { validateFEN };
