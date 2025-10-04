// CSV Service for fetching data from Google Sheets CSV export
import Papa from 'papaparse';
import { Student } from '../types';

const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSJYI6zpSzRgAhxtfMr75zAFiJqjuJC-5dRe81l-u5xevVQebaWqPRFmRqTR0r9rm1bXF_nVwg-ZVNY/pub?output=csv';

export interface CSVStudent {
  Name: string;
  email: string;
  'mobile number': string;
  'parents name': string;
  "parent's mobile number": string;
}

export const fetchStudentsFromCSV = async (): Promise<Student[]> => {
  try {
    console.log('Fetching data from CSV:', CSV_URL);
    
    // Add timestamp to prevent caching
    const urlWithTimestamp = `${CSV_URL}&t=${Date.now()}`;
    
    const response = await fetch(urlWithTimestamp, {
      method: 'GET',
      headers: {
        'Accept': 'text/csv',
        'Cache-Control': 'no-cache',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const csvText = await response.text();
    console.log('CSV Response received, length:', csvText.length);
    console.log('First 200 characters:', csvText.substring(0, 200));
    
    if (!csvText || csvText.trim().length === 0) {
      console.warn('Empty CSV response');
      return [];
    }
    
    return new Promise((resolve, reject) => {
      Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => {
          // Clean up header names and handle variations
          return header.trim();
        },
        complete: (results) => {
          try {
            console.log('CSV parsing complete. Rows found:', results.data.length);
            console.log('Headers found:', results.meta.fields);
            console.log('Sample row:', results.data[0]);
            
            if (results.errors && results.errors.length > 0) {
              console.warn('CSV parsing errors:', results.errors);
            }
            
            const students: Student[] = results.data
              .map((row: any, index: number) => {
                try {
                  // Handle different possible column names (case-insensitive and flexible)
                  const getField = (fieldNames: string[]) => {
                    const keys = Object.keys(row);
                    
                    // First pass: try exact matches for all field names
                    for (const fieldName of fieldNames) {
                      // Try exact match first
                      if (row[fieldName] !== undefined && row[fieldName] !== null && row[fieldName] !== '') {
                        return String(row[fieldName]).trim();
                      }
                      
                      // Try case-insensitive exact match
                      const exactMatch = keys.find(key => 
                        key.toLowerCase() === fieldName.toLowerCase()
                      );
                      
                      if (exactMatch && row[exactMatch] !== undefined && row[exactMatch] !== null && row[exactMatch] !== '') {
                        return String(row[exactMatch]).trim();
                      }
                    }
                    
                    // Second pass: try partial matches only if no exact matches found, with explicit exclusions
                    for (const fieldName of fieldNames) {
                      const partialMatch = keys.find(key => {
                        const keyLower = key.toLowerCase();
                        const fieldLower = fieldName.toLowerCase();
                        
                        // Explicitly avoid problematic false matches
                        if (fieldLower === 'address' && keyLower.includes('email')) {
                          return false;
                        }
                        
                        // Only match if field name appears as complete word in the key
                        return keyLower.includes(fieldLower) && fieldLower.length > 3;
                      });
                      
                      if (partialMatch && row[partialMatch] !== undefined && row[partialMatch] !== null && row[partialMatch] !== '') {
                        return String(row[partialMatch]).trim();
                      }
                    }
                    
                    return '';
                  };

                  const timestamp = getField(['Timestamp', 'timestamp', 'Time', 'time', 'Date', 'date']);
                  const email = getField(['Email Address', 'email', 'Email', 'E-mail', 'e-mail']);
                  const name = getField(['Name', 'name', 'student name', 'Student Name']);
                  const mobile = getField(['Mobile Number', 'mobile number', 'mobile', 'Mobile', 'phone', 'Phone']);
                  const parentName = getField(["Parent's Name", 'Parents name', 'parents name', 'Parents Name', 'parent name', 'Parent Name', 'Guardian Name']);
                  const parentMobile = getField(["Parent's Mobile Number", "Parent's number", "parent's number", "Parent's mobile number", 'parent mobile', 'Parent Mobile', 'guardian mobile']);
                  const address = getField(['Address', 'address', 'home address', 'Home Address', 'student address', 'Student Address']);
                  const vehicleNumber = getField(['Vehicle Number', 'Vehicle number', 'vehicle number', 'vehicle no', 'Vehicle No', 'bike number', 'car number']);
                  const photo = getField(['Student Photo', 'student photo', 'Student photo', 'photo', 'Photo', 'image', 'student image']);


                  // Skip rows with missing essential data
                  if (!name || !mobile) {
                    console.log(`Skipping row ${index + 1}: Missing name or mobile`, { name, mobile });
                    return null;
                  }

                  // Parse registration date from timestamp (format: MM/DD/YYYY HH:MM:SS)
                  let registrationDate = new Date();
                  if (timestamp) {
                    try {
                      registrationDate = new Date(timestamp);
                      if (isNaN(registrationDate.getTime())) {
                        registrationDate = new Date();
                      }
                    } catch (e) {
                      console.warn(`Invalid timestamp for row ${index + 1}:`, timestamp);
                    }
                  }

                  // Calculate fee expiry date (exactly 30 days from registration)
                  const feeExpiryDate = new Date(registrationDate);
                  feeExpiryDate.setDate(feeExpiryDate.getDate() + 30);

                  const student: Student = {
                    id: `csv-${index + 1}`,
                    name: name,
                    mobile: mobile,
                    email: email || undefined,
                    parentName: parentName || 'Not Provided',
                    parentMobile: parentMobile || mobile, // Use student mobile if parent mobile not provided
                    address: address || undefined,
                    vehicleNumber: vehicleNumber || undefined,
                    photo: photo || undefined,
                    registrationDate: registrationDate.toISOString().split('T')[0],
                    feeExpiryDate: feeExpiryDate.toISOString().split('T')[0],
                    status: 'active',
                    totalFeesPaid: 0, // Will be updated manually by owner
                  };

                  console.log(`Processed student ${index + 1}:`, student);
                  return student;
                } catch (error) {
                  console.error(`Error processing row ${index + 1}:`, error, row);
                  return null;
                }
              })
              .filter((student): student is Student => student !== null);

            console.log(`Successfully processed ${students.length} students from CSV`);
            
            if (students.length === 0) {
              console.warn('No valid students found in CSV data');
              console.log('Available fields in CSV:', results.meta.fields);
              console.log('Sample data row:', results.data[0]);
            }
            
            resolve(students);
          } catch (error) {
            console.error('Error processing CSV data:', error);
            reject(error);
          }
        },
        error: (error : unknown) => {
          console.error('Error parsing CSV:', error);
          reject(error);
        }
      });
    });
  } catch (error) {
    console.error('Error fetching CSV:', error);
    throw new Error(`Failed to fetch student data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const addStudentToCSV = async (student: Omit<Student, 'id'>): Promise<string> => {
  // Note: This is a simulation since we can't directly write to Google Sheets CSV
  // In a real implementation, you would need to use Google Sheets API
  console.log('Adding student to CSV (simulated):', student);
  return Promise.resolve(Date.now().toString());
};

export const updateStudentInCSV = async (id: string, updates: Partial<Student>): Promise<void> => {
  // Note: This is a simulation since we can't directly write to Google Sheets CSV
  // In a real implementation, you would need to use Google Sheets API
  console.log('Updating student in CSV (simulated):', id, updates);
  return Promise.resolve();
};