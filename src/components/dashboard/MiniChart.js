import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip);

const MiniChart = ({ data, status }) => {
  const getColor = () => {
    switch (status) {
      case 'up':
        return { line: 'rgb(34, 197, 94)', bg: 'rgba(34, 197, 94, 0.1)' };
      case 'down':
        return { line: 'rgb(239, 68, 68)', bg: 'rgba(239, 68, 68, 0.1)' };
      default:
        return { line: 'rgb(115, 115, 115)', bg: 'rgba(115, 115, 115, 0.1)' };
    }
  };

  const colors = getColor();

  const chartData = {
    labels: data?.map((_, i) => i) || [],
    datasets: [
      {
        data: data || [],
        borderColor: colors.line,
        backgroundColor: colors.bg,
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 0,
        pointHoverRadius: 0,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
    scales: {
      x: { display: false },
      y: { display: false },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  return (
    <div className="w-full h-full">
      <Line data={chartData} options={options} />
    </div>
  );
};

export default MiniChart;

