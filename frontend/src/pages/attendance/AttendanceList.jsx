import React, { useState, useEffect } from 'react';
import { attendanceApi } from '../../api';
import { useAuth } from '../../context/AuthContext';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import toast from 'react-hot-toast';
import { FiClock, FiCheck, FiX, FiCalendar, FiDownload } from 'react-icons/fi';
import { HiOutlineQrcode } from 'react-icons/hi';
import moment from 'moment';

export const AttendanceList = () => {
  const { user, isHR } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [month, setMonth] = useState(moment().month() + 1);
  const [year, setYear] = useState(moment().year());

  const fetchAttendance = async () => {
    try {
      const res = await attendanceApi.getAll({ month, year });
      setRecords(res.data?.data || []);
    } catch {
      toast.error('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [month, year]);

  const handleGenerateQR = async () => {
    try {
      const res = await attendanceApi.generateQR();
      setQrCodeData(res.data?.data);
      setQrModalOpen(true);
    } catch {
      toast.error('Failed to generate attendance QR code');
    }
  };

  const handleManualCheckIn = async () => {
    try {
      await attendanceApi.checkIn({});
      toast.success('Check-in recorded!');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-in failed');
    }
  };

  const handleManualCheckOut = async () => {
    try {
      await attendanceApi.checkOut();
      toast.success('Check-out recorded!');
      fetchAttendance();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Check-out failed');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Attendance Records & Clock
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Punctuality tracking, QR code check-ins, and monthly work logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Employee Clock buttons */}
          <button
            onClick={handleManualCheckIn}
            className="btn-success flex items-center gap-1.5 text-xs"
          >
            <FiClock /> Clock In
          </button>
          <button
            onClick={handleManualCheckOut}
            className="btn-secondary flex items-center gap-1.5 text-xs"
          >
            🛑 Clock Out
          </button>
          {isHR() && (
            <button
              onClick={handleGenerateQR}
              className="btn-primary flex items-center gap-2 text-xs"
            >
              <HiOutlineQrcode className="w-4 h-4" /> Generate QR Code
            </button>
          )}
        </div>
      </div>

      {/* Attendance Table */}
      <div className="table-container card">
        {loading ? (
          <LoadingSpinner text="Fetching attendance history..." />
        ) : records.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            No attendance entries logged for this period.
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                <th>Clock In</th>
                <th>Clock Out</th>
                <th>Duration</th>
                <th>Status</th>
                <th>Late Flag</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id}>
                  <td className="font-semibold text-xs text-slate-900 dark:text-white">
                    {r.employeeId?.name || user?.name}
                  </td>
                  <td className="text-xs">
                    {moment(r.date).format('ddd, DD MMM YYYY')}
                  </td>
                  <td className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                    {r.checkIn ? moment(r.checkIn).format('hh:mm A') : '--'}
                  </td>
                  <td className="text-xs font-mono text-slate-500">
                    {r.checkOut ? moment(r.checkOut).format('hh:mm A') : 'Active'}
                  </td>
                  <td className="text-xs">
                    {r.workingHours ? `${Math.floor(r.workingHours / 60)}h ${r.workingHours % 60}m` : '--'}
                  </td>
                  <td>
                    <span className={`badge ${r.status === 'Present' ? 'status-active' : r.status === 'Late' ? 'priority-medium' : 'status-inactive'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.isLate ? (
                      <span className="text-[11px] text-amber-500 font-semibold">
                        +{r.lateMinutes} mins late
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">On time</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* QR Code Modal for HR Attendance Kiosk */}
      <Modal
        isOpen={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        title="Live QR Attendance Kiosk"
      >
        <div className="text-center py-4 space-y-4">
          <p className="text-xs text-slate-500">
            Employees can scan this dynamic daily QR code from their mobile browser to verify attendance instantly.
          </p>
          {qrCodeData?.qrDataUrl && (
            <div className="flex justify-center p-4 bg-white rounded-2xl shadow-inner inline-block mx-auto">
              <img
                src={qrCodeData.qrDataUrl}
                alt="Attendance QR"
                className="w-64 h-64 object-contain rounded-xl"
              />
            </div>
          )}
          <p className="text-[11px] text-slate-400">
            Valid until end of work day • Token secured
          </p>
        </div>
      </Modal>
    </div>
  );
};

export default AttendanceList;
