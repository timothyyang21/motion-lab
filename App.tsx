import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from './src/tokens/ThemeProvider';
import { AccountScreen } from './src/screens/AccountScreen';

function Root() {
  const { scheme } = useTheme();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <AccountScreen />
    </>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <Root />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
