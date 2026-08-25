function validatePassword(password) {
  const hasMinLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  if (!hasMinLength || !hasUpperCase || !hasNumber) {
    return 'Password must be at least 8 characters, contain 1 uppercase letter and 1 number.';
  }
  return null;
}

function validateTargetScore(score) {
  if (isNaN(score) || score < 400 || score > 1600) {
    return 'Target Score must be between 400 and 1600.';
  }
  return null;
}