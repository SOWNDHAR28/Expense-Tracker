import React, {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from "react";
import {
  ScrollView,
  ScrollViewProps,
  KeyboardAvoidingView,
  Keyboard,
  Platform,
  StyleSheet,
  ViewStyle,
  StyleProp,
  EmitterSubscription,
  View,
} from "react-native";

export interface KeyboardAwareScrollViewRef {
  scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToEnd: (options?: { animated?: boolean }) => void;
  scrollToPosition: (x: number, y: number, animated?: boolean) => void;
  scrollToInput: (layoutY: number, extraOffset?: number) => void;
  getScrollView: () => ScrollView | null;
}

export interface KeyboardAwareScrollViewProps extends ScrollViewProps {
  extraScrollHeight?: number;
  keyboardVerticalOffset?: number;
  enableOnAndroid?: boolean;
}

interface KeyboardAwareScrollContextType {
  scrollToInput: (layoutY: number, extraOffset?: number) => void;
  scrollToEnd: () => void;
  keyboardHeight: number;
  isKeyboardVisible: boolean;
}

const KeyboardAwareScrollContext = createContext<KeyboardAwareScrollContextType | null>(null);

export const useKeyboardAwareScroll = () => {
  return useContext(KeyboardAwareScrollContext);
};

export const KeyboardAwareScrollView = forwardRef<
  KeyboardAwareScrollViewRef,
  KeyboardAwareScrollViewProps
>((props, ref) => {
  const {
    children,
    style,
    contentContainerStyle,
    extraScrollHeight = 60,
    keyboardVerticalOffset = 0,
    enableOnAndroid = true,
    keyboardShouldPersistTaps = "handled",
    showsVerticalScrollIndicator = false,
    ...restProps
  } = props;

  const scrollRef = useRef<ScrollView>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const pendingScrollYRef = useRef<number | null>(null);
  const isScrollToEndPendingRef = useRef(false);

  // Measure and adjust for keyboard across Android and iOS
  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const showSub: EmitterSubscription = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates?.height || 0;
      setKeyboardHeight(height);

      // Perform pending scrolls once keyboard is confirmed visible
      if (isScrollToEndPendingRef.current) {
        isScrollToEndPendingRef.current = false;
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 80);
      } else if (pendingScrollYRef.current !== null) {
        const targetY = pendingScrollYRef.current;
        pendingScrollYRef.current = null;
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: Math.max(0, targetY), animated: true });
        }, 80);
      }
    });

    const hideSub: EmitterSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
      pendingScrollYRef.current = null;
      isScrollToEndPendingRef.current = false;
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToInput = useCallback(
    (layoutY: number, extraOffset = 40) => {
      const targetY = Math.max(0, layoutY - extraOffset);
      if (keyboardHeight > 0) {
        // Keyboard is already open, scroll immediately
        scrollRef.current?.scrollTo({ y: targetY, animated: true });
      } else {
        // Queue scroll for when keyboard finishes appearing
        pendingScrollYRef.current = targetY;
        // Also fire tentative scroll
        setTimeout(() => {
          scrollRef.current?.scrollTo({ y: targetY, animated: true });
        }, 120);
      }
    },
    [keyboardHeight]
  );

  const scrollToEndHandler = useCallback(() => {
    if (keyboardHeight > 0) {
      scrollRef.current?.scrollToEnd({ animated: true });
    } else {
      isScrollToEndPendingRef.current = true;
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 120);
    }
  }, [keyboardHeight]);

  useImperativeHandle(ref, () => ({
    scrollTo: (options) => scrollRef.current?.scrollTo(options),
    scrollToEnd: (options) => scrollRef.current?.scrollToEnd(options),
    scrollToPosition: (x, y, animated = true) => scrollRef.current?.scrollTo({ x, y, animated }),
    scrollToInput,
    getScrollView: () => scrollRef.current,
  }));

  // Resolve base paddingBottom from user's contentContainerStyle
  const flattenedContainerStyle = StyleSheet.flatten(contentContainerStyle) || {};
  const basePaddingBottom =
    typeof flattenedContainerStyle.paddingBottom === "number"
      ? flattenedContainerStyle.paddingBottom
      : 30;

  // On Android (especially Expo Go edge-to-edge), add keyboard height to bottom padding
  const dynamicPaddingBottom =
    Platform.OS === "android" && enableOnAndroid && keyboardHeight > 0
      ? basePaddingBottom + keyboardHeight + extraScrollHeight
      : basePaddingBottom;

  const content = (
    <ScrollView
      ref={scrollRef}
      style={style}
      contentContainerStyle={[
        contentContainerStyle,
        { paddingBottom: dynamicPaddingBottom },
      ]}
      showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      keyboardShouldPersistTaps={keyboardShouldPersistTaps}
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets={false}
      {...restProps}
    >
      {children}
    </ScrollView>
  );

  const contextValue = {
    scrollToInput,
    scrollToEnd: scrollToEndHandler,
    keyboardHeight,
    isKeyboardVisible: keyboardHeight > 0,
  };

  return (
    <KeyboardAwareScrollContext.Provider value={contextValue}>
      {Platform.OS === "ios" ? (
        <KeyboardAvoidingView
          style={styles.keyboardAvoidingView}
          behavior="padding"
          keyboardVerticalOffset={keyboardVerticalOffset}
        >
          {content}
        </KeyboardAvoidingView>
      ) : (
        content
      )}
    </KeyboardAwareScrollContext.Provider>
  );
});

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
});

export default KeyboardAwareScrollView;
