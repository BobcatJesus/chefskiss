import { StyleSheet, View } from 'react-native';

type OutdoorAccentProps = {
  compact?: boolean;
};

export function OutdoorAccent({ compact = false }: OutdoorAccentProps) {
  return (
    <View style={[styles.wrap, compact ? styles.wrapCompact : null]}>
      <View style={[styles.hill, styles.hillBack]} />
      <View style={[styles.hill, styles.hillMid]} />
      <View style={[styles.hill, styles.hillFront]} />

      <View style={[styles.tree, styles.treeOne]}>
        <View style={styles.treeCanopy} />
        <View style={styles.treeTrunk} />
      </View>
      <View style={[styles.tree, styles.treeTwo]}>
        <View style={[styles.treeCanopy, styles.treeCanopyAlt]} />
        <View style={styles.treeTrunk} />
      </View>

      <View style={[styles.shrub, styles.shrubOne]} />
      <View style={[styles.shrub, styles.shrubTwo]} />
      <View style={[styles.shrub, styles.shrubThree]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    height: 62,
    marginTop: 10,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  wrapCompact: {
    height: 50,
  },
  hill: {
    position: 'absolute',
    bottom: -16,
    borderRadius: 999,
  },
  hillBack: {
    left: -20,
    right: 80,
    height: 54,
    backgroundColor: '#dcfce7',
  },
  hillMid: {
    left: 60,
    right: -10,
    height: 52,
    backgroundColor: '#bbf7d0',
  },
  hillFront: {
    left: -12,
    right: -12,
    height: 34,
    backgroundColor: '#86efac',
  },
  tree: {
    position: 'absolute',
    bottom: 18,
    alignItems: 'center',
  },
  treeOne: {
    left: 36,
  },
  treeTwo: {
    right: 42,
  },
  treeCanopy: {
    width: 18,
    height: 18,
    borderRadius: 12,
    backgroundColor: '#22c55e',
    borderWidth: 1,
    borderColor: '#15803d',
  },
  treeCanopyAlt: {
    backgroundColor: '#16a34a',
  },
  treeTrunk: {
    width: 4,
    height: 10,
    marginTop: -1,
    borderRadius: 2,
    backgroundColor: '#92400e',
  },
  shrub: {
    position: 'absolute',
    bottom: 9,
    width: 15,
    height: 9,
    borderRadius: 8,
    backgroundColor: '#16a34a',
    borderWidth: 1,
    borderColor: '#166534',
  },
  shrubOne: {
    left: 92,
  },
  shrubTwo: {
    left: 136,
  },
  shrubThree: {
    right: 98,
  },
});
