import React from 'react';
import { useTheme } from '../config/ThemeContext';
import OperatorSelect from './OperatorSelect';

/**
 * Filter bar for audit change pages.
 * Always shows: Record#, Source, Dates, Limit, Include New.
 * Conditionally shows: Warehouse, Customer#, Product# — controlled by props.
 */
export default function FilterBar({
  filters, setFilters, loading, onSearch, onExport, onClear, onCancel, hasData,
  recordLabel = 'PO #',
  recordPlaceholder = '5167702, 5184325-2',
  sourceOptions = [],
  showWarehouse = false,
  showCustomer = false,
  showProduct = false,
  showVendor = false,
  showOperator = false,
}) {
  const { theme } = useTheme();
  const inputStyle = {
    padding: '10px 14px', background: theme.colors.bgInput, border: `1px solid ${theme.colors.border}`,
    borderRadius: theme.radii.md, color: theme.colors.text, fontSize: 12, outline: 'none', width: '100%',
  };
  const labelStyle = {
    fontSize: 10, fontWeight: 600, color: theme.colors.textMuted, letterSpacing: '0.05em',
    textTransform: 'uppercase', marginBottom: 4,
  };

  const hasFilters = !!(filters.pono || filters.whse || filters.fromDate || filters.toDate || filters.source || filters.custno || filters.vendno || filters.operinit || filters.prod || (filters.limit && filters.limit !== '500'));

  return (
    <div style={{ background: theme.colors.bgCard, border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.lg, padding: 20, marginBottom: 20 }}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>

        <div style={{ display: 'flex', flexDirection: 'column', width: 200 }}>
          <div style={labelStyle}>{recordLabel}</div>
          <input
            placeholder={`e.g. ${recordPlaceholder}`}
            value={filters.pono || ''}
            onChange={e => setFilters(f => ({ ...f, pono: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            style={{ ...inputStyle, fontFamily: theme.fonts.mono }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
          <div style={labelStyle}>Source</div>
          <select value={filters.source || ''} onChange={e => setFilters(f => ({ ...f, source: e.target.value }))}
            style={inputStyle}>
            <option value="">All Sources</option>
            {sourceOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {showWarehouse && (
          <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
            <div style={labelStyle}>Warehouse</div>
            <input placeholder="e.g. 1000, 3300" value={filters.whse || ''}
              onChange={e => setFilters(f => ({ ...f, whse: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              style={{ ...inputStyle, fontFamily: theme.fonts.mono }} />
          </div>
        )}

        {showCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
            <div style={labelStyle}>Customer #</div>
            <input placeholder="e.g. 308337" value={filters.custno || ''}
              onChange={e => setFilters(f => ({ ...f, custno: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              style={{ ...inputStyle, fontFamily: theme.fonts.mono }} />
          </div>
        )}

        {showProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
            <div style={labelStyle}>Product #</div>
            <input placeholder="e.g. 1044240" value={filters.prod || ''}
              onChange={e => setFilters(f => ({ ...f, prod: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              style={{ ...inputStyle, fontFamily: theme.fonts.mono }} />
          </div>
        )}

        {showVendor && (
          <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
            <div style={labelStyle}>Vendor #</div>
            <input placeholder="e.g. 516998" value={filters.vendno || ''}
              onChange={e => setFilters(f => ({ ...f, vendno: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              style={{ ...inputStyle, fontFamily: theme.fonts.mono }} />
          </div>
        )}

        {showOperator && (
          <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
            <div style={labelStyle}>Operator ID</div>
            <OperatorSelect
              value={filters.operinit || ''}
              onChange={val => setFilters(f => ({ ...f, operinit: val }))}
              onSearch={onSearch}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', width: 130 }}>
          <div style={labelStyle}>Start Date</div>
          <input type="date" value={filters.fromDate || ''}
            onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: 130 }}>
          <div style={labelStyle}>End Date</div>
          <input type="date" value={filters.toDate || ''}
            onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: 60 }}>
          <div style={labelStyle}>Limit</div>
          <input placeholder="500" value={filters.limit || ''}
            onChange={e => setFilters(f => ({ ...f, limit: e.target.value.replace(/[^0-9]/g, '') }))}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            style={{ ...inputStyle, fontFamily: theme.fonts.mono, textAlign: 'center' }} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.colors.textMuted, fontSize: 12, cursor: 'pointer', paddingBottom: 10 }}>
          <input type="checkbox" checked={filters.includeNew !== false}
            onChange={e => setFilters(f => ({ ...f, includeNew: e.target.checked }))} />
          Include New
        </label>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'flex-end', paddingBottom: 0 }}>
          {hasFilters && (
            <button onClick={onClear} style={{
              padding: '10px 16px', background: 'transparent',
              border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.md,
              color: theme.colors.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              ✕ CLEAR
            </button>
          )}
          {hasData && (
            <button onClick={onExport} style={{
              padding: '10px 16px', background: 'transparent',
              border: `1px solid ${theme.colors.border}`, borderRadius: theme.radii.md,
              color: theme.colors.textMuted, fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>
              📥 EXPORT CSV
            </button>
          )}
          {loading ? (
            <button onClick={onCancel} style={{
              padding: '10px 20px',
              background: `linear-gradient(135deg, #ef4444, #dc2626)`,
              border: 'none', borderRadius: theme.radii.md, color: '#fff',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em',
            }}>
              ⏹ CANCEL
            </button>
          ) : (
            <button onClick={onSearch} style={{
              padding: '10px 20px',
              background: `linear-gradient(135deg, ${theme.colors.accent}, ${theme.colors.accentDim})`,
              border: 'none', borderRadius: theme.radii.md, color: '#000',
              fontSize: 12, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em',
            }}>
              🔍 SEARCH
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
