import React, { useState, useEffect } from 'react';
import { StyleSheet, Dimensions, Image, Text, View, Alert } from 'react-native';
import { connect } from 'react-redux';
import MapView, { PROVIDER_GOOGLE, Marker, Circle } from 'react-native-maps';
import { FontAwesome5 } from '@expo/vector-icons';
import { StackActions } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import styled from 'styled-components/native';
import * as Location from 'expo-location';
import RemainingTime from '../components/RemainingTime';
import FinalQuestion from '../components/FinalQuestion';
import isLocationNear from '../utils/isLocationNear';
import configuredAxios from '../config/axiosConfig';
import {
  setUserLocation,
  setSelectedMeeting,
  setCurrentMeeting,
  setPromiseAmount,
  resetMeeting,
} from '../actions';
import { socket, socketApi } from '../../socket';
import resetAction from '../utils/navigation';
import SOCKET_EVENT from '../constants/socket';
import ALERT from '../constants/alert';
import SCREEN from '../constants/screen';
import ROUTE from '../constants/route';

const MatchSuccessScreen = ({
  userId,
  userNickname,
  userLocation,
  userPromise,
  partnerNickname,
  restaurantName,
  restaurantLocation,
  meetingId,
  expiredTime,
  currentMeeting,
  setPromiseAmount,
  setUserLocation,
  setSelectedMeeting,
  setCurrentMeeting,
  resetMeeting,
  navigation,
}) => {
  const [isArrived, setIsArrived] = useState(true);
  const [isArrivalConfirmed, setIsArrivalConfirmed] = useState(false);
  const [isOnVergeofBreaking, setIsOnVergeofBreaking] = useState(false);
  const [partnerLocation, setPartnerLocation] = useState({ latitude: 0, longitude: 0 });

  useEffect(() => {
    socketApi.joinMeeting(meetingId, userId);

    socket.on(SOCKET_EVENT.CHANGE_CURRENT_MEETING, meetingData => {
      setCurrentMeeting(meetingData);
    });

    socket.on(SOCKET_EVENT.GET_PARTNER_LOCATION, location => {
      setPartnerLocation(location);
    });

    socket.on(SOCKET_EVENT.CANCELED_BY_PARTNER, () => {
      Alert.alert(
        ALERT.TIME_OUT_TITLE,
        ALERT.TIME_OUT_MESSAGE,
        [
          {
            text: ALERT.OK,
            onPress: () => {
              socketApi.finishMeeting(() => {
                resetMeeting();
                navigation.dispatch(StackActions.replace(SCREEN.MAIN_MAP));
              });
            },
          },
        ],
        { cancelable: false }
      );
    });

    return () => socketApi.removeAllListeners();
  }, []);

  useEffect(() => {
    isLocationNear(userLocation, restaurantLocation, 500)
      ? setIsArrived(true)
      : setIsArrived(false);

    socketApi.sendLocation(userLocation);
  }, [userLocation]);

  useEffect(() => {
    (async () => {
      await Location.startLocationUpdatesAsync('background-location-task', {
        accuracy: Location.Accuracy.Highest,
        timeInterval: 1000,
        distanceInterval: 1,
        howsBackgroundLocationIndicator: true,
      });
    })();

    return async () => await Location.stopLocationUpdatesAsync('background-location-task');
  }, []);


  useEffect(() => {
    (async () => {
      try {
        const { data } = await configuredAxios.get(`${ROUTE.MEETINGS}/${meetingId}`);
        const { meetingDetails } = data;

        setSelectedMeeting(meetingDetails);
      } catch (error) {
        console.error(error);
      }
    })();
  }, []);

  const handleTimeEnd = () => {
    const isAllArrived = currentMeeting.arrivalCount >= 2;

    isAllArrived
      ? socketApi.finishMeeting(() => {
        navigation.dispatch(resetAction(0, SCREEN.AFTER_MEETING));
      })
      : socketApi.cancelMeeting(() => {
        resetMeeting();
        navigation.dispatch(resetAction(0, SCREEN.MAIN_MAP));
      });
  };

  const handleArrivalButtonClick = async () => {
    if (isArrivalConfirmed) return;

    setIsArrivalConfirmed(true);
    setPromiseAmount(userPromise + 1);

    await configuredAxios.put(`${ROUTE.USERS}/${userId}${ROUTE.PROMISE}`, {
      amount: 1,
    });

    socketApi.arriveMeeting();
  };

  const handleChatButtonClick = () => {
    navigation.navigate(SCREEN.CHAT_ROOM, { navigation });
  };

  const handleBreakupButtonClick = async () => {
    await configuredAxios.put(`${ROUTE.USERS}/${userId}${ROUTE.PROMISE}`, {
      amount: -1,
    });

    setPromiseAmount(userPromise - 1);
    socketApi.breakupMeeting(() => {
      resetMeeting();
      navigation.dispatch(StackActions.replace(SCREEN.MAIN_MAP));
    });
  };

  return (
    <Wrapper>
      <MapView
        initialRegion={{
          latitude: userLocation.latitude,
          longitude: userLocation.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        }}
        provider={PROVIDER_GOOGLE}
        style={styles.mapStyle}
        showsMyLocationButton={true}
        showsUserLocation={true}
      >
        {/* <Marker title={userNickname} coordinate={userLocation} /> */}
        <Marker title={partnerNickname} coordinate={partnerLocation} />
        <Marker title={restaurantName} coordinate={restaurantLocation}>
          <View style={styles.view}>
            <Text>{restaurantName}</Text>
            <Image
              source={require('../../assets/images/rice.png')}
              style={{
                width: 24,
                height: 26,
              }}
              resizeMode='cover'
            />
          </View>
        </Marker>
        <Circle
          center={restaurantLocation}
          radius={500}
          strokeColor='rgba(0, 0, 255, 0.1)'
          fillColor='rgba(0, 0, 255, 0.1)'
        />
      </MapView>
      <LinearGradient
        colors={['rgba(255, 255, 255, 1)', 'transparent']}
        style={styles.linearGradient}
      />
      <OverlayHeader>
        <OverlayTitle>R I C E C O C O</OverlayTitle>
        <OverlaySubDesc>매칭 성공! 1시간 내로 도착하세요!</OverlaySubDesc>
        {isArrived && (
          <ArrivalButton onPress={handleArrivalButtonClick}>
            <ArrivalText>
              {isArrivalConfirmed ? ALERT.COMPLATE_ARRIVAL : ALERT.CONFIRM_ARRIVAL}
            </ArrivalText>
          </ArrivalButton>
        )}
        {!!expiredTime && (
          <RemainingTime expiredTime={expiredTime} onTimeEnd={handleTimeEnd} />
        )}
      </OverlayHeader>
      <OverlayFooter>
        {!isArrived && (
          <ArrivalButton onPress={() => setIsOnVergeofBreaking(true)}>
            <ArrivalText>{ALERT.CANCEL_PROMISE}</ArrivalText>
          </ArrivalButton>
        )}
        {isOnVergeofBreaking && (
          <FinalQuestion
            modalVisible={isOnVergeofBreaking}
            setModalVisible={setIsOnVergeofBreaking}
            question={ALERT.CONFIRM_CANCEL_PROMISE}
            onClickYes={handleBreakupButtonClick}
          />
        )}
        <ChatButton onPress={handleChatButtonClick}>
          <FontAwesome5 name='rocketchat' size={30} color='black' />
        </ChatButton>
      </OverlayFooter>
    </Wrapper>
  );
};

const Wrapper = styled.View`
  flex: 1;
  justify-content: center;
`;

const styles = StyleSheet.create({
  mapStyle: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  linearGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 200,
  },
  view: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: 'yellow',
  },
});

const OverlayHeader = styled.View`
  display: flex;
  align-items: center;
  width: 100%;
  padding: 50px 30px 30px 30px;
  position: absolute;
  top: 0px;
`;

const OverlayTitle = styled.Text`
  width: 100%;
  text-align: center;
  font-size: 30px;
  color: #ff914d;
`;

const OverlaySubDesc = styled.Text`
  width: 100%;
  text-align: center;
  font-size: 13px;
  color: #ff914d;
`;

const OverlayFooter = styled.View`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: flex-end;
  position: absolute;
  bottom: 50px;
  right: 20px;
  width: 100%;
`;

const ChatButton = styled.TouchableOpacity`
  padding: 15px;
  border-radius: 50px;
  background-color: white;
`;

const ArrivalButton = styled.TouchableOpacity`
  width: 50%;
  padding: 10px;
  border-radius: 50px;
`;

const ArrivalText = styled.Text`
  border-radius: 50px;
  padding: 10px;
  background-color: #ff914d;
  text-align: center;
  color: white;
`;

export default connect(
  state => ({
    userId: state.user._id,
    userNickname: state.user.nickname,
    userLocation: state.location,
    partnerNickname: state.meetings.selectedMeeting.partnerNickname,
    restaurantName: state.meetings.selectedMeeting.restaurantName,
    restaurantLocation: state.meetings.selectedMeeting.restaurantLocation,
    expiredTime: state.meetings.selectedMeeting.expiredTime,
    meetingId: state.meetings.selectedMeeting.meetingId,
    currentMeeting: state.meetings.currentMeeting,
  }),
  {
    setUserLocation,
    setSelectedMeeting,
    setCurrentMeeting,
    setPromiseAmount,
    resetMeeting,
  }
)(MatchSuccessScreen);
