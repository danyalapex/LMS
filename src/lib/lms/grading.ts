export type GradingScaleBand = {
  band_label: string;
  min_percentage: number;
  max_percentage: number;
  grade_points: number | null;
  remarks: string | null;
  sort_order: number;
};

export type GradeOutcome = {
  percentage: number;
  letterGrade: string | null;
  gradePoints: number | null;
  bandRemarks: string | null;
  passed: boolean;
};

export const DEFAULT_GRADING_BANDS: GradingScaleBand[] = [
  {
    band_label: "A",
    min_percentage: 90,
    max_percentage: 100,
    grade_points: 4,
    remarks: "Excellent",
    sort_order: 1,
  },
  {
    band_label: "B",
    min_percentage: 80,
    max_percentage: 89.99,
    grade_points: 3,
    remarks: "Very good",
    sort_order: 2,
  },
  {
    band_label: "C",
    min_percentage: 70,
    max_percentage: 79.99,
    grade_points: 2,
    remarks: "Good",
    sort_order: 3,
  },
  {
    band_label: "D",
    min_percentage: 60,
    max_percentage: 69.99,
    grade_points: 1,
    remarks: "Pass",
    sort_order: 4,
  },
  {
    band_label: "F",
    min_percentage: 0,
    max_percentage: 59.99,
    grade_points: 0,
    remarks: "Needs support",
    sort_order: 5,
  },
];

function roundToPrecision(value: number, precision: number) {
  const power = 10 ** precision;
  return Math.round(value * power) / power;
}

export function deriveGradeOutcome(params: {
  score: number;
  maxScore: number;
  passMark: number;
  decimalPrecision: number;
  bands: GradingScaleBand[];
}): GradeOutcome {
  const safeMaxScore = params.maxScore > 0 ? params.maxScore : 1;
  const precision = Math.max(0, params.decimalPrecision);
  const percentage = roundToPrecision((params.score / safeMaxScore) * 100, precision);
  const sortedBands = [...params.bands].sort((a, b) => a.sort_order - b.sort_order);
  const matchedBand =
    sortedBands.find(
      (band) =>
        percentage >= Number(band.min_percentage) &&
        percentage <= Number(band.max_percentage),
    ) ?? null;

  return {
    percentage,
    letterGrade: matchedBand?.band_label ?? null,
    gradePoints:
      matchedBand?.grade_points === null || matchedBand?.grade_points === undefined
        ? null
        : Number(matchedBand.grade_points),
    bandRemarks: matchedBand?.remarks ?? null,
    passed: percentage >= params.passMark,
  };
}
