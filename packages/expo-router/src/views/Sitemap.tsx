// Copyright © 2024 650 Industries.
'use client';

import { NativeStackNavigationOptions } from '@react-navigation/native-stack';
import React from 'react';
import {
  Image,
  StyleSheet,
  Text,
  View,
  ScrollView,
  Platform,
  StatusBar,
  ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Pressable, PressableProps } from './Pressable';
import { RouteNode, sortRoutes } from '../Route';
import { store } from '../global-state/router-store';
import { Link } from '../link/Link';
import { matchDeepDynamicRouteName } from '../matchers';
import { canOverrideStatusBarBehavior } from '../utils/statusbar';

const INDENT = 20;

export function getNavOptions(): NativeStackNavigationOptions {
  return {
    title: 'sitemap',
    presentation: 'modal',
    headerLargeTitle: false,
    headerTitleStyle: {
      color: 'white',
    },
    headerTintColor: 'white',
    headerLargeTitleStyle: {
      color: 'white',
    },
    headerStyle: {
      backgroundColor: 'black',
      // @ts-expect-error: mistyped
      borderBottomColor: '#323232',
    },
    header: () => {
      const WrapperElement = Platform.OS === 'android' ? SafeAreaView : View;
      return (
        <WrapperElement style={styles.header}>
          <View style={styles.headerContent}>
            <View style={styles.headerIcon}>
              <SitemapIcon />
            </View>
            <Text role="heading" aria-level={1} style={styles.title}>
              Sitemap
            </Text>
          </View>
        </WrapperElement>
      );
    },
  };
}

export function Sitemap() {
  const children = React.useMemo(
    () => store.routeNode?.children.filter(({ internal }) => !internal).sort(sortRoutes) ?? [],
    [store.routeNode]
  );
  return (
    <View style={styles.container}>
      {canOverrideStatusBarBehavior && <StatusBar barStyle="light-content" />}
      <ScrollView contentContainerStyle={styles.scroll}>
        {children.map((route) => (
          <View testID="sitemap-item-container" key={route.contextKey} style={styles.itemContainer}>
            <SitemapItem route={route} />
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

interface SitemapItemProps {
  route: RouteNode;
  level?: number;
  segments?: string[];
  isInitial?: boolean;
}

function SitemapItem({
  route,
  level = 0,
  segments: parentSegments = [],
  isInitial = false,
}: SitemapItemProps) {
  const isLayout = React.useMemo(
    () => route.children.length > 0 || route.contextKey.match(/_layout\.[jt]sx?$/),
    [route]
  );

  const segments = React.useMemo(
    () => [...parentSegments, ...route.route.split('/')],
    [parentSegments, route.route]
  );

  if (isLayout) {
    return (
      <LayoutSitemapItem route={route} segments={segments} isInitial={isInitial} level={level} />
    );
  }
  return (
    <StandardSitemapItem route={route} segments={segments} isInitial={isInitial} level={level} />
  );
}

function LayoutSitemapItem({ route, segments, level }: Required<SitemapItemProps>) {
  const filename = React.useMemo(() => {
    const segments = route.contextKey.split('/');
    // join last two segments for layout routes
    return segments[segments.length - 2] + '/' + segments[segments.length - 1];
  }, [route]);

  return (
    <>
      <SitemapItemPressable
        style={{ opacity: 0.4 }}
        leftIcon={<PkgIcon />}
        filename={filename}
        level={level}
        info={route.generated ? 'Virtual' : ''}
      />
      {route.children.map((child) => (
        <SitemapItem
          key={child.contextKey}
          route={child}
          isInitial={route.initialRouteName === child.route}
          segments={segments}
          level={level + (route.generated ? 0 : 1)}
        />
      ))}
    </>
  );
}

function StandardSitemapItem({ route, segments, isInitial, level }: Required<SitemapItemProps>) {
  const href = React.useMemo(() => {
    return (
      '/' +
      segments
        .map((segment) => {
          // add an extra layer of entropy to the url for deep dynamic routes
          if (matchDeepDynamicRouteName(segment)) {
            return segment + '/' + Date.now();
          }
          // index must be erased but groups can be preserved.
          return segment === 'index' ? '' : segment;
        })
        .filter(Boolean)
        .join('/')
    );
  }, [segments, route.route]);

  const filename = React.useMemo(() => {
    const segments = route.contextKey.split('/');

    const routeSegmentsCount = route.route.split('/').length;

    // This presents files without layout routes as children with all relevant segments.
    return segments.slice(-routeSegmentsCount).join('/');
  }, [route]);

  const info = isInitial ? 'Initial' : route.generated ? 'Virtual' : '';

  return (
    <Link
      accessibilityLabel={route.contextKey}
      href={href}
      asChild
      // Ensure we replace the history so you can't go back to this page.
      replace>
      <SitemapItemPressable
        leftIcon={<FileIcon />}
        rightIcon={<ForwardIcon />}
        filename={filename}
        level={level}
        info={info}
      />
    </Link>
  );
}

function SitemapItemPressable({
  style,
  leftIcon,
  rightIcon,
  filename,
  level,
  info,
  ...pressableProps
}: {
  style?: ViewStyle;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  filename: string;
  level: number;
  info?: string;
} & Omit<PressableProps, 'style' | 'children'>) {
  return (
    <Pressable {...pressableProps}>
      {({ pressed, hovered }) => (
        <View
          testID="sitemap-item"
          style={[
            styles.itemPressable,
            {
              paddingLeft: INDENT + level * INDENT,
              backgroundColor: hovered ? '#202425' : 'transparent',
            },
            pressed && { backgroundColor: '#26292b' },
            style,
          ]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {leftIcon}
            <Text style={styles.filename}>{filename}</Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!!info && <Text style={[styles.virtual, { marginRight: 8 }]}>{info}</Text>}
            {rightIcon}
          </View>
        </View>
      )}
    </Pressable>
  );
}

function FileIcon() {
  return <Image style={styles.image} source={require('expo-router/assets/file.png')} />;
}

function PkgIcon() {
  return <Image style={styles.image} source={require('expo-router/assets/pkg.png')} />;
}

function ForwardIcon() {
  return <Image style={styles.image} source={require('expo-router/assets/forward.png')} />;
}

function SitemapIcon() {
  return <Image style={styles.image} source={require('expo-router/assets/sitemap.png')} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'black',
    flex: 1,
    alignItems: 'stretch',
  },
  header: {
    backgroundColor: '#151718',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#313538',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.33,
    shadowRadius: 3,
    elevation: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: '5%',
    ...Platform.select({
      web: {
        width: '100%',
        maxWidth: 960,
        marginHorizontal: 'auto',
      },
    }),
  },
  title: {
    color: 'white',
    fontSize: 28,
    fontWeight: 'bold',
  },
  scroll: {
    paddingHorizontal: '5%',
    paddingVertical: 16,
    ...Platform.select({
      ios: {
        paddingBottom: 24,
      },
      web: {
        width: '100%',
        maxWidth: 960,
        marginHorizontal: 'auto',
        paddingBottom: 24,
      },
      default: {
        paddingBottom: 12,
      },
    }),
  },
  itemContainer: {
    borderWidth: 1,
    borderColor: '#313538',
    backgroundColor: '#151718',
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'hidden',
  },
  itemPressable: {
    paddingHorizontal: INDENT,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      web: {
        transitionDuration: '100ms',
      },
    }),
  },
  filename: { color: 'white', fontSize: 20, marginLeft: 12 },
  virtual: { textAlign: 'right', color: 'white' },
  image: { width: 24, height: 24, resizeMode: 'contain', opacity: 0.6 },
  headerIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#202425',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
