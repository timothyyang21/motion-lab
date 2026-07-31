import { View } from 'react-native';
import { useTheme } from '../tokens/ThemeProvider';

export function AccountScreen() {
  const { theme } = useTheme();
  return <View style={{ flex: 1, backgroundColor: theme.ground }} />;
}
