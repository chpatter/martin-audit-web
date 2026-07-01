import React from 'react';
import { useTheme } from '../config/ThemeContext';
import OperatorSelect from './OperatorSelect';
import InfoTip from './InfoTip';

/**
 * Filter bar for audit change pages.
 * Always shows: Record#, Source, Dates, Limit, Include New.
 * Conditionally shows: Warehouse, Customer#, Product#, Vendor#, Operator — controlled by props.
 */
export default function FilterBar({
  filters, setFilters, loading, onSearch, onExport, onClear, onCancel, hasData,
  recordLabel = 'PO #',
  recordPlaceholder = '5167702, 5184325-2',
  recordTooltip = 'The primary record identifier to search for',
  sourceOptions = [],
  showWarehouse = false,
  showCustomer = false,
  showProduct = false,
  showVendor = false,
  showOperator = false,
  recordAsOperator = false,
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
          <div style={labelStyle}>{recordLabel} <InfoTip text={recordTooltip} /></div>
          {recordAsOperator ? (
            <OperatorSelect
              value={filters.pono || ''}
              onChange={val => setFilters(f => ({ ...f, pono: val }))}
              onSearch={onSearch}
            />
          ) : (
            <input
              placeholder={`e.g. ${recordPlaceholder}`}
              value={filters.pono || ''}
              onChange={e => setFilters(f => ({ ...f, pono: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              style={{ ...inputStyle, fontFamily: theme.fonts.mono }}
            />
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
          <div style={labelStyle}>Source <InfoTip text="Filter results to a specific data source table. Leave on 'All Sources' to search all tables in this module." /></div>
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
            <div style={labelStyle}>Warehouse <InfoTip text="Filter by warehouse number (e.g. 1000, 1300, 3300)" /></div>
            <input placeholder="e.g. 1000, 3300" value={filters.whse || ''}
              onChange={e => setFilters(f => ({ ...f, whse: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              style={{ ...inputStyle, fontFamily: theme.fonts.mono }} />
          </div>
        )}

        {showCustomer && (
          <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
            <div style={labelStyle}>Customer # <InfoTip text="Filter by customer number" /></div>
            <input placeholder="e.g. 308337" value={filters.custno || ''}
              onChange={e => setFilters(f => ({ ...f, custno: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              style={{ ...inputStyle, fontFamily: theme.fonts.mono }} />
          </div>
        )}

        {showProduct && (
          <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
            <div style={labelStyle}>Product # <InfoTip text="Filter by product number" /></div>
            <input placeholder="e.g. 1044240" value={filters.prod || ''}
              onChange={e => setFilters(f => ({ ...f, prod: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              style={{ ...inputStyle, fontFamily: theme.fonts.mono }} />
          </div>
        )}

        {showVendor && (
          <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
            <div style={labelStyle}>Vendor # <InfoTip text="Filter by vendor number" /></div>
            <input placeholder="e.g. 516998" value={filters.vendno || ''}
              onChange={e => setFilters(f => ({ ...f, vendno: e.target.value }))}
              onKeyDown={e => e.key === 'Enter' && onSearch()}
              style={{ ...inputStyle, fontFamily: theme.fonts.mono }} />
          </div>
        )}

        {showOperator && (
          <div style={{ display: 'flex', flexDirection: 'column', width: 150 }}>
            <div style={labelStyle}>Operator ID <InfoTip text="Filter by the operator who made the change. This shows who changed the record, not the record being changed." /></div>
            <OperatorSelect
              value={filters.operinit || ''}
              onChange={val => setFilters(f => ({ ...f, operinit: val }))}
              onSearch={onSearch}
            />
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', width: 130 }}>
          <div style={labelStyle}>Start Date <InfoTip text="Show changes on or after this date. Defaults to 7 days ago." /></div>
          <input type="date" value={filters.fromDate || ''}
            onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: 130 }}>
          <div style={labelStyle}>End Date <InfoTip text="Show changes on or before this date. Leave blank to include up to today." /></div>
          <input type="date" value={filters.toDate || ''}
            onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            style={inputStyle} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', width: 60 }}>
          <div style={labelStyle}>Limit <InfoTip text="Maximum number of records to return per table. Lower values return faster." /></div>
          <input placeholder="500" value={filters.limit || ''}
            onChange={e => setFilters(f => ({ ...f, limit: e.target.value.replace(/[^0-9]/g, '') }))}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            style={{ ...inputStyle, fontFamily: theme.fonts.mono, textAlign: 'center' }} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 6, color: theme.colors.textMuted, fontSize: 12, cursor: 'pointer', paddingBottom: 10 }}>
          <input type="checkbox" checked={filters.includeNew !== false}
            onChange={e => setFilters(f => ({ ...f, includeNew: e.target.checked }))} />
          Include New <InfoTip text="When checked, results include the initial creation of records (shown as 'New'). Uncheck to see only changes to existing records." />
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
