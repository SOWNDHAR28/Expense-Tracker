declare module 'react-native-safe-area-context' {
  import * as React from 'react';
  import { ViewProps } from 'react-native';

  export interface EdgeInsets {
    top: number;
    bottom: number;
    left: number;
    right: number;
  }

  export interface NativeSafeAreaViewProps extends ViewProps {
    children?: React.ReactNode;
  }

  export const SafeAreaProvider: React.FC<{ children?: React.ReactNode }>;
  export const SafeAreaView: React.FC<NativeSafeAreaViewProps>;
  export const useSafeAreaInsets: () => EdgeInsets;
}
