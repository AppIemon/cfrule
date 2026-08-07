const JOB_IMAGE_FILE = {
  '?': '물음표',
  '페인터': '물음표'
};

export const TIER_MAKER_JOBS = [
  '67', '갈릴레오', '감시자', '검객', '고죠', '공룡', '과학자', '기관사', '기자', '나이트', '늑대인간',
  '뜀틀선수', '마법사', '마하트마간디', '물음표', '반장', '닭2병걸린닭', '비밀요원', '빚쟁이', '사과',
  '사신', '생존자', '수리사', '수집가', '수학자', '스폰지밥', '스핔이', '시인', '시프터', '우라늄',
  '은하계전사', '작곡가', '전우치', '천사', '페인터', '프로그래머', '피보나치', '해달', '해커',
  '혜성전사', '환자', '홍명보'
];

export function jobImageFile(name) {
  return JOB_IMAGE_FILE[name] || name;
}

export function jobImageSrc(name) {
  const file = jobImageFile(name);
  return `/job-images/${encodeURIComponent(encodeURIComponent(file))}.png`;
}
