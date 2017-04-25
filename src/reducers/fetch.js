POLYDUX.reducers.add('fetch', (state = {}, action) => {
  let assign = x => Object.assign({}, state, x);

  if(typeof state.counter === 'undefined') {
    state.counter = 0;
  }

  let c = state.counter;

  switch (action.type) {

    case 'FETCH_INCREMENT':
      return assign({
        counter: c + 1,
        loading: true
      });

    case 'FETCH_DECREMENT':
      c = Math.max(c - 1, 0);
      return assign({
        counter: c,
        loading: c > 0
      });

    default:
      return state;
  }
});
