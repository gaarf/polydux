POLYDUX.reducers.add('user', (state = {}, action) => {

  switch (action.type) {

    case 'USER_MESSAGE':
      return Object.assign({}, state, {
        message: action.message || ''
      });

    case 'USER_WHOAMI':
      // only keep the message
      return Object.assign({
        message: state.message
      }, action.data);

    default:
      return state;
  }
});

