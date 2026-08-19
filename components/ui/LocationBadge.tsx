import { StyleSheet, Text, View } from 'react-native';

type LocationBadgeProps = {
  location: string;
};

export function LocationBadge({ location }: LocationBadgeProps) {
  const safeLocation = location.trim().length > 0 ? location : 'Location pending';

  return (
    <View style={styles.badge}>
      <View style={styles.pin}>
        <View style={styles.pinDot} />
      </View>
      <Text style={styles.label} numberOfLines={2}>
        {safeLocation}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    maxWidth: '88%',
    borderWidth: 1,
    borderColor: '#fdba74',
    backgroundColor: '#fff7ed',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 18,
    borderBottomLeftRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#c2410c',
    backgroundColor: '#fed7aa',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#9a3412',
  },
  label: {
    flexShrink: 1,
    color: '#7c2d12',
    fontSize: 13,
    fontWeight: '700',
  },
});
