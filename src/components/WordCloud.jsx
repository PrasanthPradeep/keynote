/**
 * WordCloud.jsx
 *
 * Renders a topic word cloud using d3-cloud layout algorithm.
 *
 * Props:
 *  topics:   Array<{ word: string, weight: number }>
 *  onExport: (canvas: HTMLCanvasElement) => void  — called when PNG export requested
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

// Color palette — vibrant, harmonious shades for dark background
const WORD_COLORS = [
  'hsl(258, 90%, 72%)',
  'hsl(195, 85%, 65%)',
  'hsl(340, 80%, 68%)',
  'hsl(155, 70%, 58%)',
  'hsl(30,  90%, 65%)',
  'hsl(210, 80%, 68%)',
  'hsl(290, 70%, 70%)',
  'hsl(55,  85%, 65%)',
];

/** Map a topic weight to a font size (px) within the canvas */
function weightToFontSize(weight, minWeight, maxWeight, minPx = 18, maxPx = 88) {
  if (maxWeight === minWeight) return (minPx + maxPx) / 2;
  const t = (weight - minWeight) / (maxWeight - minWeight);
  // Use a power curve to exaggerate differences
  return Math.round(minPx + Math.pow(t, 0.7) * (maxPx - minPx));
}

export default function WordCloud({ topics, onExport }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const [dimensions, setDimensions]   = useState({ width: 720, height: 440 });
  const [isRendered, setIsRendered]   = useState(false);

  // ── Measure container ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({
        width:  Math.max(width, 280),
        height: Math.min(Math.max(width * 0.6, 280), 520),
      });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // ── Run d3-cloud layout ────────────────────────────────────────────────────
  useEffect(() => {
    if (!topics?.length || !svgRef.current) return;
    setIsRendered(false);

    const weights = topics.map((t) => t.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);

    const words = topics.map((t, i) => ({
      text:  t.word,
      size:  weightToFontSize(t.weight, minW, maxW),
      color: WORD_COLORS[i % WORD_COLORS.length],
      weight: t.weight,
    }));

    const layout = cloud()
      .size([dimensions.width, dimensions.height])
      .words(words)
      .padding(6)
      .rotate(() => (Math.random() > 0.75 ? 90 : 0))
      .font('Inter, sans-serif')
      .fontWeight((d) => (d.weight === Math.max(...weights) ? '700' : '600'))
      .fontSize((d) => d.size)
      .on('end', draw);

    layout.start();

    function draw(computedWords) {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const g = svg
        .attr('width', dimensions.width)
        .attr('height', dimensions.height)
        .style('background', 'transparent')
        .append('g')
        .attr('transform', `translate(${dimensions.width / 2},${dimensions.height / 2})`);

      g.selectAll('text')
        .data(computedWords)
        .enter()
        .append('text')
        .style('font-size', (d) => `${d.size}px`)
        .style('font-family', 'Inter, sans-serif')
        .style('font-weight', (d) => (d.weight === maxW ? '700' : '600'))
        .style('fill', (d) => d.color)
        .style('cursor', 'default')
        .style('user-select', 'none')
        .attr('text-anchor', 'middle')
        .attr('transform', (d) => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .attr('aria-label', (d) => `${d.text} (prominence: ${d.weight})`)
        .text((d) => d.text)
        .on('mouseenter', function () {
          d3.select(this).style('opacity', 0.75);
        })
        .on('mouseleave', function () {
          d3.select(this).style('opacity', 1);
        });

      setIsRendered(true);
    }
  }, [topics, dimensions]);

  // ── PNG export via canvas ──────────────────────────────────────────────────
  const exportPng = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const { width, height } = dimensions;
    const svgData = new XMLSerializer().serializeToString(svg);

    // Embed font in SVG for export
    const svgWithStyle = svgData.replace(
      '<svg',
      `<svg xmlns="http://www.w3.org/2000/svg" style="background:#0d1117"`
    );

    const blob = new Blob([svgWithStyle], { type: 'image/svg+xml;charset=utf-8' });
    const url  = URL.createObjectURL(blob);
    const img  = new Image();

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale  = 2; // Retina-quality export
      canvas.width  = width  * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = '#0d1117';
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);

      canvas.toBlob((pngBlob) => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(pngBlob);
        a.download = 'keynote-word-cloud.png';
        a.click();
        URL.revokeObjectURL(a.href);
      }, 'image/png');
    };

    img.src = url;
  }, [dimensions]);

  return (
    <div className="wordcloud-wrap">
      {/* Cloud container */}
      <div ref={containerRef} className="wordcloud-container" aria-label="Word cloud visualization">
        <svg
          ref={svgRef}
          className="wordcloud-svg"
          role="img"
          aria-label={`Word cloud showing: ${topics?.map((t) => t.word).join(', ')}`}
        />
        {!isRendered && (
          <div className="wordcloud-loading" aria-hidden="true">
            <div className="spinner" />
          </div>
        )}
      </div>

      {/* Export button */}
      <button
        className="btn btn-secondary"
        onClick={exportPng}
        disabled={!isRendered}
        id="btn-download-png"
        aria-label="Download word cloud as PNG image"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        Download PNG
      </button>
    </div>
  );
}
