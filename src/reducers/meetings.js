import * as types from '../constants/actionTypes';

const initialState = {
  filteredMeetings: [],
  selectedMeeting: {
    meetingId: '',
    restaurantId: '',
    restaurantName: '',
    restaurantLocation: {
      latitude: 0,
      longitude: 0
    },
    partnerNickname: '',
    expiredTime: '',
  },
  currentMeeting: {
    meetingId : '',
    users: [],
    arrivalCount: 0,
  }
};

export const meetings = (state = initialState, action) => {
  switch (action.type) {
    case types.SET_FILTERED_MEETINGS:
      return {
        ...state,
        filteredMeetings: [ ...action.payload ],
      };
    case types.SET_SELECTED_MEETING:
      return {
        ...state,
        selectedMeeting: {
          ...state.selectedMeeting,
          ...action.payload
        },
      };
    case types.SET_CURRENT_MEETING:
      return {
        ...state,
        currentMeeting: action.payload
      }
    case types.RESET_MEETING:
      return initialState;
    default:
      return state;
  }
};
