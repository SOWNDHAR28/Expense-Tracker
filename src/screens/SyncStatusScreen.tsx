import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '../redux/hooks';
import { fetchTransactions, syncPendingTransactions } from '../redux/slices/transactionSlice';
import { useTheme } from '../context/ThemeContext';
import { supabase } from '../services/supabase';

export default function SyncStatusScreen() {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { themeColors } = useTheme();
  
  const localTransactions = useAppSelector(state => state.transactions.items);
  const pendingCount = useAppSelector(state => state.transactions.pendingCount);
  const { user } = useAppSelector(state => state.auth);
  
  const [cloudCount, setCloudCount] = useState<number | null>(null);
  const [cloudLoading, setCloudLoading] = useState(false);
  const [cloudError, setCloudError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const checkCloudData = async () => {
    setCloudLoading(true);
    setCloudError(null);
    try {
      if (!user) throw new Error("Not logged in");
      
      const { data, error, count } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true });
        
      if (error) throw error;
      
      setCloudCount(count || 0);
    } catch (err: any) {
      setCloudError(err.message || 'Unknown network error');
    } finally {
      setCloudLoading(false);
    }
  };

  useEffect(() => {
    checkCloudData();
  }, []);

  const handleForceSync = async () => {
    setIsUploading(true);
    try {
      await dispatch(syncPendingTransactions()).unwrap();
      Alert.alert("Success", "Pending transactions synced to cloud.");
      checkCloudData(); // Refresh cloud count after sync
    } catch (err: any) {
      Alert.alert("Sync Failed", err.message || "Network request failed");
    } finally {
      setIsUploading(false);
    }
  };

  const handleFetchFromCloud = async () => {
    setIsFetching(true);
    try {
      await dispatch(fetchTransactions()).unwrap();
      Alert.alert("Success", "Local data refreshed from cloud.");
      checkCloudData();
    } catch (err: any) {
      Alert.alert("Fetch Failed", err.message || "Network request failed");
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: themeColors.background }]}>
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={themeColors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.text }]}>Sync Status</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.container}>
        
        {/* Device Local State */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>
            <Ionicons name="phone-portrait-outline" size={20} /> Device State (Local)
          </Text>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: themeColors.muted }]}>Total Transactions:</Text>
            <Text style={[styles.statValue, { color: themeColors.text }]}>{localTransactions.length}</Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: themeColors.muted }]}>Synced Locally:</Text>
            <Text style={[styles.statValue, { color: themeColors.success }]}>
              {localTransactions.length - pendingCount}
            </Text>
          </View>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: themeColors.muted }]}>Pending Upload:</Text>
            <Text style={[styles.statValue, { color: pendingCount > 0 ? themeColors.expense : themeColors.success }]}>
              {pendingCount}
            </Text>
          </View>
        </View>

        {/* Cloud State */}
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardTitle, { color: themeColors.text }]}>
            <Ionicons name="cloud-outline" size={20} /> Supabase State (Cloud)
          </Text>
          
          {cloudLoading ? (
            <ActivityIndicator size="small" color={themeColors.primary} style={{ marginVertical: 16 }} />
          ) : cloudError ? (
            <View style={[styles.errorBox, { backgroundColor: themeColors.softExpense }]}>
              <Text style={[styles.errorText, { color: themeColors.expense }]}>
                <Ionicons name="alert-circle" size={16} /> Error: {cloudError}
              </Text>
              <Text style={[styles.errorSubtext, { color: themeColors.expense }]}>
                This indicates your phone cannot reach Supabase (Network request failed). Please check your internet connection or if the Supabase project is active.
              </Text>
            </View>
          ) : (
            <View style={styles.statRow}>
              <Text style={[styles.statLabel, { color: themeColors.muted }]}>Total Transactions in Cloud:</Text>
              <Text style={[styles.statValue, { color: themeColors.text }]}>
                {cloudCount !== null ? cloudCount : '-'}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.refreshBtn, { backgroundColor: themeColors.primary + '20' }]}
            onPress={checkCloudData}
            disabled={cloudLoading}
          >
            <Ionicons name="refresh" size={18} color={themeColors.primary} />
            <Text style={[styles.refreshBtnText, { color: themeColors.primary }]}>Test Network Connection</Text>
          </TouchableOpacity>
        </View>

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: themeColors.primary }]}
            onPress={handleForceSync}
            disabled={isUploading || isFetching}
          >
            {isUploading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Force Upload Pending</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity 
            style={[styles.actionBtn, { backgroundColor: themeColors.success, marginTop: 12 }]}
            onPress={handleFetchFromCloud}
            disabled={isUploading || isFetching}
          >
            {isFetching ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="cloud-download-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Fetch From Cloud</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  container: { padding: 16 },
  card: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statLabel: { fontSize: 16 },
  statValue: { fontSize: 18, fontWeight: 'bold' },
  errorBox: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  errorSubtext: {
    fontSize: 12,
    lineHeight: 18,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  refreshBtnText: {
    marginLeft: 8,
    fontWeight: 'bold',
  },
  actionsContainer: {
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
});
