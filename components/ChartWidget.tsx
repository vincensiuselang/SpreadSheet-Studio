import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { motion, AnimatePresence, animate } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { WidgetConfig, WidgetType, DataRow } from '../types';
import { COLORS } from '../constants';
import { useLanguage } from '../contexts/LanguageContext';

interface ChartWidgetProps {
  widget: WidgetConfig;
  data: DataRow[];
}

const ChartSkeleton = () => (
  <motion.div 
    key="chart-skeleton"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="w-full h-full flex flex-col relative overflow-hidden p-4"
  >
    {/* Grid Background */}
    <div className="absolute inset-0 p-4 flex flex-col justify-between pointer-events-none opacity-5">
      {[1, 2, 3, 4].map(i => <div key={i} className="w-full h-px bg-current" />)}
    </div>

    {/* Animated Bars */}
    <div className="flex-1 flex items-end justify-between gap-2 px-2 z-10 pb-6 pt-4">
      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          className="flex-1 bg-gray-200 dark:bg-slate-700/60 rounded-t-md"
          animate={{
            height: ["20%", "50%", "30%", "70%", "25%"],
            opacity: [0.4, 0.7, 0.4]
          }}
          transition={{
            duration: 2 + Math.random(), // Randomize duration slightly for organic feel
            ease: "easeInOut",
            repeat: Infinity,
            delay: i * 0.1,
            repeatType: "mirror"
          }}
        />
      ))}
    </div>

    {/* Axis Line */}
    <div className="w-full h-0.5 bg-gray-100 dark:bg-slate-700/50 rounded-full" />

    {/* Shimmer Overlay */}
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent -skew-x-12"
      animate={{ x: ['-150%', '150%'] }}
      transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
    />
  </motion.div>
);

const StatSkeleton = () => (
    <motion.div 
      key="stat-skeleton"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center justify-center h-full p-4 space-y-4 relative overflow-hidden"
    >
        <motion.div 
          className="h-12 w-32 bg-gray-200 dark:bg-slate-700/60 rounded-xl"
          animate={{ scale: [0.95, 1.02, 0.95], opacity: [0.5, 0.8, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="h-4 w-20 bg-gray-200 dark:bg-slate-700/60 rounded-lg"
          animate={{ opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        />
        
        {/* Shimmer Overlay */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 dark:via-white/5 to-transparent -skew-x-12"
          animate={{ x: ['-150%', '150%'] }}
          transition={{ duration: 1.5, ease: "linear", repeat: Infinity }}
        />
    </motion.div>
);

// Component to count up numbers smoothly
const AnimatedNumber = ({ value }: { value: number }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (!node) return;

    const controls = animate(0, value, {
      duration: 1.2,
      ease: "easeOut",
      onUpdate(v) {
        node.textContent = v.toLocaleString(undefined, { maximumFractionDigits: 2 });
      },
    });

    return () => controls.stop();
  }, [value]);

  return <span ref={nodeRef} />;
};

export const ChartWidget: React.FC<ChartWidgetProps> = ({ widget, data }) => {
  const [processedData, setProcessedData] = useState<any[]>([]);
  const [statValue, setStatValue] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    let isMounted = true;
    setIsProcessing(true);

    const timer = setTimeout(() => {
      if (!isMounted) return;

      if (!data.length) {
        setProcessedData([]);
        setStatValue(0);
        setIsProcessing(false);
        setHasLoaded(true);
        return;
      }

      // --- 1. Calculate Chart Data ---
      const groups: Record<string, any> = {};

      data.forEach(row => {
        const groupKey = String(row[widget.dataKey] || 'Unknown');
        if (!groups[groupKey]) {
          groups[groupKey] = { name: groupKey, value: 0, count: 0, rawValues: [] };
        }
        
        const val = widget.valueKey ? Number(row[widget.valueKey]) || 0 : 1;
        groups[groupKey].rawValues.push(val);
        groups[groupKey].count += 1;
      });

      const finalChartData = Object.values(groups).map(g => {
        let finalValue = 0;
        if (widget.aggregation === 'sum') finalValue = g.rawValues.reduce((a: number, b: number) => a + b, 0);
        else if (widget.aggregation === 'avg') finalValue = g.rawValues.reduce((a: number, b: number) => a + b, 0) / g.count;
        else if (widget.aggregation === 'max') finalValue = Math.max(...g.rawValues);
        else if (widget.aggregation === 'min') finalValue = Math.min(...g.rawValues);
        else finalValue = g.count;

        return {
          name: g.name,
          value: parseFloat(finalValue.toFixed(2))
        };
      }).sort((a, b) => b.value - a.value).slice(0, 20);

      // --- 2. Calculate Stat Data ---
      let finalStatValue = 0;
      if (widget.type === WidgetType.STAT) {
        if (widget.aggregation === 'count') {
          finalStatValue = data.length;
        } else {
          const values = data.map(d => Number(d[widget.valueKey || '']) || 0);
          if (widget.aggregation === 'sum') finalStatValue = values.reduce((a, b) => a + b, 0);
          else if (widget.aggregation === 'avg') finalStatValue = values.reduce((a, b) => a + b, 0) / (values.length || 1);
          else if (widget.aggregation === 'max') finalStatValue = Math.max(...values);
          else if (widget.aggregation === 'min') finalStatValue = Math.min(...values);
        }
      }

      if (isMounted) {
        setProcessedData(finalChartData);
        setStatValue(finalStatValue);
        setIsProcessing(false);
        setHasLoaded(true);
      }
    }, 800); // Delay to show off the fancy animation

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [data, widget]);

  const showSkeleton = isProcessing && !hasLoaded;
  const showUpdatingOverlay = isProcessing && hasLoaded;
  const seriesName = widget.valueKey || 'Count';

  return (
    <div className="w-full h-full relative">
      <AnimatePresence mode="wait">
        {showSkeleton ? (
           widget.type === WidgetType.STAT ? <StatSkeleton /> : <ChartSkeleton />
        ) : (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full h-full relative"
          >
            {/* Context Aware Loading Overlay */}
            <AnimatePresence>
              {showUpdatingOverlay && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 bg-white/60 dark:bg-dark-card/60 backdrop-blur-[2px] flex items-center justify-center rounded-xl"
                >
                   <div className="bg-white dark:bg-slate-800 p-3 rounded-full shadow-lg border border-gray-100 dark:border-gray-700">
                     <Loader2 className="w-6 h-6 text-primary animate-spin" />
                   </div>
                </motion.div>
              )}
            </AnimatePresence>

            {widget.type === WidgetType.STAT ? (
              <div className="flex flex-col items-center justify-center h-full p-4">
                <span className="text-4xl font-bold text-primary dark:text-secondary">
                   <AnimatedNumber value={statValue} />
                </span>
                <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 uppercase tracking-wide font-medium">
                  {widget.aggregation} {t('of_rows').replace('Rows', widget.valueKey || t('rows'))}
                </span>
              </div>
            ) : (
              <div className="w-full h-full min-h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  {widget.type === WidgetType.BAR ? (
                    <BarChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30 stroke-gray-300 dark:stroke-gray-700" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={11} 
                        tick={{fill: 'currentColor'}} 
                        tickLine={false}
                        axisLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                        height={30}
                      />
                      <YAxis 
                        fontSize={11} 
                        tick={{fill: 'currentColor'}} 
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => value.toLocaleString()}
                      />
                      <Tooltip 
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                        contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                          borderColor: 'rgba(51, 65, 85, 0.5)', 
                          color: '#f8fafc',
                          borderRadius: '8px',
                          backdropFilter: 'blur(4px)',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Bar name={seriesName} dataKey="value" fill={COLORS[0]} radius={[4, 4, 0, 0]} isAnimationActive={true} animationDuration={1000} animationBegin={200}>
                         {processedData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                      </Bar>
                    </BarChart>
                  ) : widget.type === WidgetType.LINE ? (
                    <LineChart data={processedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30 stroke-gray-300 dark:stroke-gray-700" />
                      <XAxis 
                        dataKey="name" 
                        fontSize={11} 
                        tick={{fill: 'currentColor'}}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis 
                        fontSize={11} 
                        tick={{fill: 'currentColor'}}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip 
                         contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                          borderColor: 'rgba(51, 65, 85, 0.5)', 
                          color: '#f8fafc',
                          borderRadius: '8px',
                          backdropFilter: 'blur(4px)',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend verticalAlign="top" height={36} iconType="circle" />
                      <Line 
                        name={seriesName}
                        type="monotone" 
                        dataKey="value" 
                        stroke={COLORS[1]} 
                        strokeWidth={3} 
                        dot={{r: 4, strokeWidth: 2}} 
                        activeDot={{r: 6}}
                        isAnimationActive={true}
                        animationDuration={1500}
                        animationBegin={200}
                      />
                    </LineChart>
                  ) : (
                    <PieChart>
                      <Pie
                        data={processedData}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        isAnimationActive={true}
                        animationDuration={1000}
                        animationBegin={200}
                      >
                        {processedData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                         contentStyle={{ 
                          backgroundColor: 'rgba(15, 23, 42, 0.9)', 
                          borderColor: 'rgba(51, 65, 85, 0.5)', 
                          color: '#f8fafc',
                          borderRadius: '8px',
                          backdropFilter: 'blur(4px)',
                          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                        }}
                      />
                      <Legend verticalAlign="bottom" height={36} iconType="circle"/>
                    </PieChart>
                  )}
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};