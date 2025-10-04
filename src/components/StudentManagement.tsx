import React, { useState } from 'react';
import { Plus, Search, FileEdit as Edit, Trash2, Phone, Mail, Calendar, User, RefreshCw } from 'lucide-react';
import { Student } from '../types';

interface StudentManagementProps {
  students: Student[];
  onAddStudent: (student: Omit<Student, 'id'>) => void;
  onUpdateStudent: (id: string, student: Partial<Student>) => void;
  onDeleteStudent: (id: string) => void;
  onRefreshFromCSV: () => Promise<number>;
}

const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  onRefreshFromCSV,
}) => {
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshMessage, setRefreshMessage] = useState('');

  const filteredStudents = students.filter(student =>
    student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    student.mobile.includes(searchTerm) ||
    student.seatNumber?.toString().includes(searchTerm)
  );

  const [validationError, setValidationError] = useState('');

  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      setRefreshMessage('');
      const newCount = await onRefreshFromCSV();
      if (newCount > 0) {
        setRefreshMessage(`Successfully added ${newCount} new student(s) from Google Sheets`);
      } else {
        setRefreshMessage('No new students found in Google Sheets');
      }
      setTimeout(() => setRefreshMessage(''), 5000);
    } catch (error) {
      setRefreshMessage('Failed to refresh data. Please try again.');
      setTimeout(() => setRefreshMessage(''), 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const validateMobileNumber = (mobile: string): boolean => {
    const mobileRegex = /^[0-9]{10}$/;
    return mobileRegex.test(mobile);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError('');
    const formData = new FormData(e.currentTarget);
    
    const mobile = formData.get('mobile') as string;
    const parentMobile = formData.get('parentMobile') as string;
    const name = formData.get('name') as string;
    const parentName = formData.get('parentName') as string;
    
    // Validation checks
    if (!name.trim()) {
      setValidationError('Student name is required');
      return;
    }
    
    if (!mobile.trim()) {
      setValidationError('Student mobile number is required');
      return;
    }
    
    if (!validateMobileNumber(mobile)) {
      setValidationError('Student mobile number must be exactly 10 digits');
      return;
    }
    
    if (!parentName.trim()) {
      setValidationError('Parent name is required');
      return;
    }
    
    if (!parentMobile.trim()) {
      setValidationError('Parent mobile number is required');
      return;
    }
    
    if (!validateMobileNumber(parentMobile)) {
      setValidationError('Parent mobile number must be exactly 10 digits');
      return;
    }
    
    const studentData = {
      name,
      mobile,
      email: formData.get('email') as string,
      parentName,
      parentMobile,
      address: formData.get('address') as string,
      vehicleNumber: formData.get('vehicleNumber') as string,
      photo: formData.get('photo') as string,
      registrationDate: new Date().toISOString().split('T')[0],
      feeExpiryDate: (() => {
        const now = new Date();
        const expiryDate = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());
        return expiryDate.toISOString().split('T')[0];
      })(),
      status: 'active' as const,
      totalFeesPaid: 0,
    };

    if (editingStudent) {
      onUpdateStudent(editingStudent.id, studentData);
      setEditingStudent(null);
    } else {
      onAddStudent(studentData);
    }
    
    setShowAddForm(false);
    setValidationError('');
    e.currentTarget.reset();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <h2 className="text-2xl font-bold text-gray-900">Student Management</h2>
        <div className="flex space-x-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span>{isRefreshing ? 'Refreshing...' : 'Refresh from Sheets'}</span>
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
        </div>
      </div>

      {/* Refresh Message */}
      {refreshMessage && (
        <div className={`rounded-lg p-4 ${
          refreshMessage.includes('Successfully') || refreshMessage.includes('No new')
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${
            refreshMessage.includes('Successfully') || refreshMessage.includes('No new')
              ? 'text-green-700'
              : 'text-red-700'
          }`}>{refreshMessage}</p>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          placeholder="Search students by name, mobile, or seat number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Add/Edit Form Modal */}
      {(showAddForm || editingStudent) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">
              {editingStudent ? 'Edit Student' : 'Add New Student'}
            </h3>
            {/* Validation Error */}
            {validationError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-sm text-red-700">{validationError}</p>
              </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingStudent?.name || ''}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                <input
                  type="tel"
                  name="mobile"
                  defaultValue={editingStudent?.mobile || ''}
                  required
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Must be exactly 10 digits</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  name="email"
                  defaultValue={editingStudent?.email || ''}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Name</label>
                <input
                  type="text"
                  name="parentName"
                  defaultValue={editingStudent?.parentName || ''}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Parent Mobile</label>
                <input
                  type="tel"
                  name="parentMobile"
                  defaultValue={editingStudent?.parentMobile || ''}
                  required
                  pattern="[0-9]{10}"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">Must be exactly 10 digits</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  name="address"
                  defaultValue={editingStudent?.address || ''}
                  rows={3}
                  placeholder="Enter student's address"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                <input
                  type="text"
                  name="vehicleNumber"
                  defaultValue={editingStudent?.vehicleNumber || ''}
                  placeholder="Enter vehicle number (if any)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Student Photo</label>
                <input
                  type="text"
                  name="photo"
                  defaultValue={editingStudent?.photo || ''}
                  placeholder="Enter photo URL or description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
                >
                  {editingStudent ? 'Update' : 'Add'} Student
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingStudent(null);
                    setValidationError('');
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Details Modal */}
      {viewingStudent && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Student Details</h3>
              <button
                onClick={() => setViewingStudent(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              {viewingStudent.photo && (
                <div className="flex justify-center mb-4">
                  <img
                    src={viewingStudent.photo}
                    alt={viewingStudent.name}
                    className="w-24 h-24 rounded-full object-cover border-2 border-gray-200"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = 'none';
                    }}
                  />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Name</label>
                  <p className="text-sm text-gray-900">{viewingStudent.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
                  <p className="text-sm text-gray-900">{viewingStudent.mobile}</p>
                </div>
              </div>
              
              {viewingStudent.email && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <p className="text-sm text-gray-900">{viewingStudent.email}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Parent's Name</label>
                  <p className="text-sm text-gray-900">{viewingStudent.parentName}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Parent's Number</label>
                  <p className="text-sm text-gray-900">{viewingStudent.parentMobile}</p>
                </div>
              </div>
              
              {viewingStudent.address && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Address</label>
                  <p className="text-sm text-gray-900">{viewingStudent.address}</p>
                </div>
              )}
              
              {viewingStudent.vehicleNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Vehicle Number</label>
                  <p className="text-sm text-gray-900">{viewingStudent.vehicleNumber}</p>
                </div>
              )}
              
              {viewingStudent.photo && (
                <div>
                  <label className="block text-sm font-medium text-gray-700">Student Photo</label>
                  <p className="text-sm text-gray-500">Photo: {viewingStudent.photo}</p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Registration Date</label>
                  <p className="text-sm text-gray-900">{new Date(viewingStudent.registrationDate).toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Fee Expiry Date</label>
                  <p className="text-sm text-gray-900">{new Date(viewingStudent.feeExpiryDate).toLocaleDateString('en-IN')}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    viewingStudent.status === 'active' 
                      ? 'bg-green-100 text-green-800'
                      : viewingStudent.status === 'expired'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-800'
                  }`}>
                    {viewingStudent.status.charAt(0).toUpperCase() + viewingStudent.status.slice(1)}
                  </span>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Seat Number</label>
                  <p className="text-sm text-gray-900">{viewingStudent.seatNumber ? `Seat ${viewingStudent.seatNumber}` : 'Not Assigned'}</p>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Fees Paid</label>
                <p className="text-sm text-gray-900">₹{viewingStudent.totalFeesPaid}</p>
              </div>
            </div>
            
            <div className="flex space-x-3 pt-6">
              <button
                onClick={() => {
                  setViewingStudent(null);
                  setEditingStudent(viewingStudent);
                }}
                className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors"
              >
                Edit Student
              </button>
              <button
                onClick={() => setViewingStudent(null)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredStudents.length === 0 && !searchTerm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Students Yet</h3>
          <p className="text-gray-500 mb-4">
            Get started by adding students manually or refresh to fetch data from Google Sheets
          </p>
          <div className="flex justify-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh from Sheets</span>
            </button>
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student</span>
            </button>
          </div>
        </div>
      )}

      {/* Students List */}
      {filteredStudents.length > 0 && (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Seat</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fee Expiry</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredStudents.map((student) => (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        {student.photo ? (
                          <img
                            src={student.photo}
                            alt={student.name}
                            className="h-10 w-10 rounded-full object-cover border border-gray-200"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const fallback = target.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        ) : null}
                        <div className={`h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center ${student.photo ? 'hidden' : ''}`}>
                          <User className="h-5 w-5 text-indigo-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <button
                          onClick={() => setViewingStudent(student)}
                          className="text-sm font-medium text-indigo-600 hover:text-indigo-900 cursor-pointer"
                        >
                          {student.name}
                        </button>
                        <div className="text-sm text-gray-500">Parent: {student.parentName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 flex items-center">
                      <Phone className="w-4 h-4 mr-1" />
                      {student.mobile}
                    </div>
                    {student.email && (
                      <div className="text-sm text-gray-500 flex items-center">
                        <Mail className="w-4 h-4 mr-1" />
                        {student.email}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      student.seatNumber 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.seatNumber ? `Seat ${student.seatNumber}` : 'Not Assigned'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      student.status === 'active' 
                        ? 'bg-green-100 text-green-800'
                        : student.status === 'expired'
                        ? 'bg-red-100 text-red-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(student.feeExpiryDate).toLocaleDateString('en-IN')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteStudent(student.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* No Search Results */}
      {filteredStudents.length === 0 && searchTerm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Results Found</h3>
          <p className="text-gray-500">
            No students match your search for "{searchTerm}"
          </p>
        </div>
      )}
    </div>
  );
};

export default StudentManagement;