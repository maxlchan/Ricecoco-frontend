import React, { useEffect } from 'react';
import { Text, Button } from 'react-native';
import asyncStorage from '@react-native-async-storage/async-storage';

const MainMapScreen = ({ navigation }) => {
  useEffect(() => {
    (async () => {
      const a = await asyncStorage.getItem('token');

    })();
  }, []);

  return (
    <>
      <Text>메인 맵입니다..^O^/</Text>
      <Button title="돌아가기" onPress={() => navigation.goBack()} />
    </>
  );
};

export default MainMapScreen;
