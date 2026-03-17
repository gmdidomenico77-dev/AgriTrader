/**
 * Backend Test Screen
 * Add this to your app to test backend connectivity visually
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { API_BASE_URL, testBackendConnection } from '../lib/config';
import { predictionService } from '../lib/predictionService';

export default function BackendTestScreen() {
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const addResult = (test: string, success: boolean, message: string, data?: any) => {
    setResults(prev => [...prev, { test, success, message, data, timestamp: new Date() }]);
  };

  const runTests = async () => {
    setLoading(true);
    setResults([]);

    try {
      // Test 1: Backend connection
      addResult('Starting tests', true, 'Running backend diagnostics...', null);
      
      const connectionTest = await testBackendConnection();
      addResult(
        'Backend Connection',
        connectionTest.success,
        connectionTest.message,
        { url: connectionTest.url }
      );

      if (!connectionTest.success) {
        addResult('Test Suite', false, 'Stopped: Backend not available', null);
        setLoading(false);
        return;
      }

      // Test 2: Corn prediction
      try {
        const cornPrediction = await predictionService.getPrediction('corn', 'PA');
        addResult(
          'Corn Prediction',
          true,
          `Price: $${cornPrediction.predicted_price.toFixed(2)}`,
          cornPrediction
        );
      } catch (error) {
        addResult('Corn Prediction', false, `Failed: ${error}`, null);
      }

      // Test 3: Soybeans prediction
      try {
        const soyPrediction = await predictionService.getPrediction('soybeans', 'PA');
        addResult(
          'Soybeans Prediction',
          true,
          `Price: $${soyPrediction.predicted_price.toFixed(2)}`,
          soyPrediction
        );
      } catch (error) {
        addResult('Soybeans Prediction', false, `Failed: ${error}`, null);
      }

      // Test 4: Wheat prediction
      try {
        const wheatPrediction = await predictionService.getPrediction('wheat', 'PA');
        addResult(
          'Wheat Prediction',
          true,
          `Price: $${wheatPrediction.predicted_price.toFixed(2)}`,
          wheatPrediction
        );
      } catch (error) {
        addResult('Wheat Prediction', false, `Failed: ${error}`, null);
      }

      // Test 5: Graph data
      try {
        const graphData = await predictionService.getGraphData('corn', 'PA');
        addResult(
          'Graph Data',
          true,
          `Got ${graphData.data_points.length} data points`,
          graphData
        );
      } catch (error) {
        addResult('Graph Data', false, `Failed: ${error}`, null);
      }

      addResult('Test Suite', true, 'All tests completed!', null);
    } catch (error) {
      addResult('Test Suite', false, `Unexpected error: ${error}`, null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Backend Diagnostic</Text>
        <Text style={styles.subtitle}>API: {API_BASE_URL}</Text>
      </View>

      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={runTests}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Run Tests</Text>
        )}
      </TouchableOpacity>

      <ScrollView style={styles.results}>
        {results.map((result, index) => (
          <View
            key={index}
            style={[
              styles.resultCard,
              result.success ? styles.successCard : styles.errorCard
            ]}
          >
            <View style={styles.resultHeader}>
              <Text style={styles.resultIcon}>
                {result.success ? '✅' : '❌'}
              </Text>
              <Text style={styles.resultTest}>{result.test}</Text>
            </View>
            <Text style={styles.resultMessage}>{result.message}</Text>
            {result.data && (
              <Text style={styles.resultData} numberOfLines={3}>
                {JSON.stringify(result.data, null, 2)}
              </Text>
            )}
            <Text style={styles.resultTime}>
              {result.timestamp.toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </ScrollView>

      {results.length > 0 && (
        <View style={styles.summary}>
          <Text style={styles.summaryText}>
            Tests Run: {results.length} |{' '}
            Passed: {results.filter(r => r.success).length} |{' '}
            Failed: {results.filter(r => !r.success).length}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#2d5016',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  subtitle: {
    fontSize: 12,
    color: '#d1fae5',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#2d5016',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  results: {
    flex: 1,
    padding: 16,
  },
  resultCard: {
    backgroundColor: '#fff',
    padding: 16,
    marginBottom: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
  },
  successCard: {
    borderLeftColor: '#22c55e',
  },
  errorCard: {
    borderLeftColor: '#ef4444',
  },
  resultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  resultTest: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  resultMessage: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  resultData: {
    fontSize: 11,
    color: '#9ca3af',
    fontFamily: 'monospace',
    backgroundColor: '#f3f4f6',
    padding: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  resultTime: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'right',
  },
  summary: {
    backgroundColor: '#fff',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  summaryText: {
    fontSize: 14,
    color: '#1f2937',
    fontWeight: '500',
    textAlign: 'center',
  },
});

