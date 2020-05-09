import {FIELD_AVAILABILITY} from './consts';

const validateFEN = (fen) => {
  for (let num=1; num<=8; num++) {
    fen = fen.replace(RegExp(num, 'g'), '-'.repeat(num));
  }
  fen = fen.split('/').map(item=>item.split(''));
  return fen.length === 8 && fen.every((item)=>item.length === 8);
}

const getEmptyAvailabilityMatrix = () => {
  return [
    [FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE], 
    [FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE], 
    [FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE], 
    [FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE], 
    [FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE], 
    [FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE], 
    [FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE], 
    [FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE, FIELD_AVAILABILITY.UNAVAILABLE]
  ]
}

export { validateFEN, getEmptyAvailabilityMatrix };
