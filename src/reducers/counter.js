POLYSTUFF.reducers.add('counter', (state = {}, action) => {
  let assign = x => Object.assign({}, state, x);

  if(typeof state.number === 'undefined') {
    state.number = 2;
  }

  switch (action.type) {

    case 'COUNTER_INCREMENT':
      return assign({
        number: (state.number || 0) + 1
      });

    case 'COUNTER_DECREMENT':
      return assign({
        number: (state.number || 0) - 1
      });

    default:
      return state;
  }
});
