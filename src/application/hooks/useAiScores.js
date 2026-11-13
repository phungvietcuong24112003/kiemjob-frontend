import { useState, useCallback, useRef } from 'react';
import { applicationApi } from '../../infrastructure/api/applicationApi';

/**
 * Hook quản lý trạng thái chấm điểm AI theo phiên làm việc (Session-scoped)
 * - Quản lý trạng thái từng hồ sơ: idle | loading | success | failed | no_text
 * - Chấm điểm đơn lẻ
 * - Chấm điểm hàng loạt với tối đa 2 request đồng thời (Concurrency limit = 2)
 * - Theo dõi tiến độ chấm điểm
 */
export function useAiScores() {
  const [scores, setScores] = useState({});
  const [batchProgress, setBatchProgress] = useState({
    isRunning: false,
    total: 0,
    completed: 0,
  });

  const scoresRef = useRef(scores);
  scoresRef.current = scores;

  const setScoreState = useCallback((id, stateUpdate) => {
    setScores((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] || {}),
        ...stateUpdate,
      },
    }));
  }, []);

  /**
   * Chấm điểm cho 1 hồ sơ ứng tuyển
   */
  const scoreOne = useCallback(
    async (applicationId) => {
      if (!applicationId) return null;

      setScoreState(applicationId, {
        status: 'loading',
        error: null,
      });

      try {
        const response = await applicationApi.scoreApplication(applicationId);
        const data = response?.data || response;

        if (data.status === 'NO_TEXT') {
          setScoreState(applicationId, {
            status: 'no_text',
            data,
            error: data.summary || 'CV không đọc được văn bản',
          });
          return data;
        }

        if (data.status === 'FAILED') {
          setScoreState(applicationId, {
            status: 'failed',
            data,
            error: data.summary || 'Lỗi khi gọi dịch vụ AI',
          });
          return data;
        }

        setScoreState(applicationId, {
          status: 'success',
          data,
          error: null,
        });
        return data;
      } catch (err) {
        const errorMessage =
          err?.response?.data?.message || err?.message || 'Không thể kết nối đến AI';
        setScoreState(applicationId, {
          status: 'failed',
          data: null,
          error: errorMessage,
        });
        return null;
      }
    },
    [setScoreState]
  );

  /**
   * Chấm điểm hàng loạt cho danh sách hồ sơ với tối đa 2 request chạy song song
   */
  const scoreBatch = useCallback(
    async (applicationIds) => {
      if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
        return;
      }

      // Lọc các hồ sơ chưa đang loading
      const current = scoresRef.current;
      const idsToScore = applicationIds.filter(
        (id) => !current[id] || current[id].status !== 'loading'
      );

      if (idsToScore.length === 0) return;

      const total = idsToScore.length;
      let completed = 0;

      setBatchProgress({
        isRunning: true,
        total,
        completed: 0,
      });

      const queue = [...idsToScore];
      const concurrencyLimit = 2; // Ràng buộc: tối đa 2 request song song

      const runWorker = async () => {
        while (queue.length > 0) {
          const nextId = queue.shift();
          if (nextId) {
            await scoreOne(nextId);
            completed++;
            setBatchProgress((prev) => ({
              ...prev,
              completed,
            }));
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(concurrencyLimit, queue.length) },
        () => runWorker()
      );

      await Promise.all(workers);

      setBatchProgress({
        isRunning: false,
        total,
        completed: total,
      });
    },
    [scoreOne]
  );

  /**
   * Thử lại cho một hồ sơ bị lỗi
   */
  const retryScore = useCallback(
    (applicationId) => {
      return scoreOne(applicationId);
    },
    [scoreOne]
  );

  return {
    scores,
    batchProgress,
    scoreOne,
    scoreBatch,
    retryScore,
    setScores,
  };
}

export default useAiScores;

