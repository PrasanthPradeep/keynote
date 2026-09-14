/**
 * WordCloud.jsx
 *
 * Renders a topic word cloud using d3-cloud layout algorithm.
 * Supports palette selection and click-to-remove words.
 *
 * Props:
 *  topics:        Array<{ word: string, weight: number }>
 *  removedWords:  Set<string>  — words to exclude from rendering
 *  onRemoveWord:  (word: string) => void
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';

const PALETTES = {
  vibrant: {
    label: 'Vibrant',
    colors: ['#a855f7', '#38bdf8', '#f43f5e', '#34d399', '#fbbf24', '#818cf8', '#c084fc', '#2dd4bf'],
  },
  mono: {
    label: 'Mono',
    colors: ['#18181b', '#3f3f46', '#52525b', '#71717a', '#a1a1aa', '#d4d4d8', '#18181b', '#3f3f46'],
  },
  ocean: {
    label: 'Ocean',
    colors: ['#0ea5e9', '#06b6d4', '#14b8a6', '#0284c7', '#0891b2', '#0d9488', '#38bdf8', '#22d3ee'],
  },
  sunset: {
    label: 'Sunset',
    colors: ['#f97316', '#ef4444', '#eab308', '#f59e0b', '#dc2626', '#fbbf24', '#fb923c', '#f87171'],
  },
  forest: {
    label: 'Forest',
    colors: ['#16a34a', '#059669', '#0d9488', '#15803d', '#047857', '#0f766e', '#22c55e', '#10b981'],
  },
};

function weightToFontSize(weight, minWeight, maxWeight, minPx = 18, maxPx = 76) {
  if (maxWeight === minWeight) return (minPx + maxPx) / 2;
  const t = (weight - minWeight) / (maxWeight - minWeight);
  return Math.round(minPx + Math.pow(t, 0.7) * (maxPx - minPx));
}

export default function WordCloud({ topics, removedWords = new Set(), onRemoveWord }) {
  const containerRef = useRef(null);
  const svgRef       = useRef(null);
  const [dimensions, setDimensions]   = useState({ width: 720, height: 440 });
  const [isRendered, setIsRendered]   = useState(false);
  const [downloaded, setDownloaded]   = useState(false);
  const [palette, setPalette]         = useState('vibrant');

  const colors = PALETTES[palette].colors;

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver((entries) => {
      const { width } = entries[0].contentRect;
      setDimensions({
        width:  Math.max(width, 280),
        height: Math.min(Math.max(width * 0.6, 280), 500),
      });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!topics?.length || !svgRef.current) return;
    setIsRendered(false);

    const filtered = topics.filter((t) => !removedWords.has(t.word));
    if (!filtered.length) {
      d3.select(svgRef.current).selectAll('*').remove();
      setIsRendered(true);
      return;
    }

    const weights = filtered.map((t) => t.weight);
    const minW = Math.min(...weights);
    const maxW = Math.max(...weights);

    const words = filtered.map((t, i) => ({
      text:   t.word,
      size:   weightToFontSize(t.weight, minW, maxW),
      color:  colors[i % colors.length],
      weight: t.weight,
    }));

    const layout = cloud()
      .size([dimensions.width, dimensions.height])
      .words(words)
      .padding(6)
      .rotate(() => (Math.random() > 0.8 ? 90 : 0))
      .font('system-ui, -apple-system, sans-serif')
      .fontWeight((d) => (d.weight === maxW ? '700' : '600'))
      .fontSize((d) => d.size)
      .on('end', draw);

    layout.start();

    function draw(computedWords) {
      const svg = d3.select(svgRef.current);
      svg.selectAll('*').remove();

      const g = svg
        .attr('width', dimensions.width)
        .attr('height', dimensions.height)
        .attr('viewBox', `0 0 ${dimensions.width} ${dimensions.height}`)
        .style('background', 'transparent')
        .append('g')
        .attr('transform', `translate(${dimensions.width / 2},${dimensions.height / 2})`);

      g.selectAll('text')
        .data(computedWords)
        .enter()
        .append('text')
        .style('font-size', (d) => `${d.size}px`)
        .style('font-family', 'system-ui, -apple-system, sans-serif')
        .style('font-weight', (d) => (d.weight === maxW ? '700' : '600'))
        .style('fill', (d) => d.color)
        .style('cursor', onRemoveWord ? 'pointer' : 'default')
        .style('user-select', 'none')
        .attr('text-anchor', 'middle')
        .attr('transform', (d) => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .attr('aria-label', (d) => `${d.text} (prominence: ${d.weight})`)
        .text((d) => d.text)
        .on('mouseenter', function () {
          d3.select(this).style('opacity', 0.7);
        })
        .on('mouseleave', function () {
          d3.select(this).style('opacity', 1);
        })
        .on('click', function (_event, d) {
          if (onRemoveWord) onRemoveWord(d.text);
        });

      setIsRendered(true);
    }
  }, [topics, dimensions, removedWords, colors, onRemoveWord]);

  const exportPng = useCallback(() => {
    const svg = svgRef.current;
    if (!svg) return;

    const { width, height } = dimensions;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const bgColor = isDark ? '#0a0a0a' : '#fafafa';

    const clone = svg.cloneNode(true);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', width);
    clone.setAttribute('height', height);

    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', bgColor);
    clone.insertBefore(bgRect, clone.firstChild);

    const svgString = new XMLSerializer().serializeToString(clone);
    const svgBase64 = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const scale = 2;
      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);
      ctx.fillStyle = bgColor;
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const pngUrl = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `keynote-word-cloud-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2000);
      } catch {
        // PNG export failed silently
      }
    };

    img.src = svgBase64;
  }, [dimensions]);

  return (
    <div className="wordcloud-wrap">
      {/* Palette picker */}
      <div className="palette-picker" role="radiogroup" aria-label="Color palette">
        {Object.entries(PALETTES).map(([key, { label, colors: c }]) => (
          <button
            key={key}
            className={`palette-swatch ${palette === key ? 'palette-swatch--active' : ''}`}
            onClick={() => setPalette(key)}
            role="radio"
            aria-checked={palette === key}
            aria-label={`${label} palette`}
            title={label}
          >
            {c.slice(0, 4).map((color, i) => (
              <span
                key={i}
                className="palette-swatch-dot"
                style={{ background: color }}
              />
            ))}
          </button>
        ))}
      </div>

      {/* Cloud container */}
      <div ref={containerRef} className="wordcloud-container" aria-label="Word cloud visualization">
        <svg
          ref={svgRef}
          className="wordcloud-svg"
          role="img"
          aria-label={`Word cloud showing: ${topics?.filter((t) => !removedWords.has(t.word)).map((t) => t.word).join(', ')}`}
        />
        {!isRendered && (
          <div className="wordcloud-loading" aria-hidden="true">
            <div className="spinner" />
          </div>
        )}
      </div>

      {/* Download button */}
      <button
        className="btn btn-secondary btn-sm"
        onClick={exportPng}
        disabled={!isRendered}
        id="btn-download-png"
        aria-label="Download word cloud as PNG image"
      >
        {downloaded ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Downloaded PNG!
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download PNG
          </>
        )}
      </button>
    </div>
  );
}
