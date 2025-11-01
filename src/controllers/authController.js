import { students, staff } from '../data/dummyData.js';

function findUserByRole(email, role) {
  const list = role === 'staff' ? staff : students;
  return list.find(u => u.email.toLowerCase() === String(email).toLowerCase());
}

export function login(req, res) {
  const { email, password, role } = req.body || {};
  if (!email || !password || !role) {
    return res.status(400).json({ success: false, message: 'email, password (DOB) and role are required' });
  }

  if (!['student', 'staff'].includes(role)) {
    return res.status(400).json({ success: false, message: 'role must be "student" or "staff"' });
  }

  const user = findUserByRole(email, role);
  if (!user || user.dob !== password) {
    return res.status(401).json({ success: false, message: 'Invalid credentials' });
  }

  // If student hasn't paid the bus fee, deny seat access and inform them
  if (role === 'student' && user.paid !== true) {
    return res.status(403).json({ success: false, message: 'Pay the bus fees to access seat' });
  }

  const { dob, ...safeUser } = user;
  return res.json({ success: true, user: safeUser });
}
