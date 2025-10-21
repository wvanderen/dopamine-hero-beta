import { jsx as _jsx } from "react/jsx-runtime";
export const Button = ({ children, onClick, variant = 'primary' }) => {
    const baseStyles = {
        padding: '0.5rem 1rem',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
        backgroundColor: variant === 'primary' ? '#0070f3' : '#6c757d',
        color: 'white',
    };
    return (_jsx("button", { style: baseStyles, onClick: onClick, children: children }));
};
//# sourceMappingURL=Button.js.map