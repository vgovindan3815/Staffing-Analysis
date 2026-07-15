export default function SplitBar({ us, india, ar, total }) {
  if (!total) return null;
  const usW = Math.round((us    ?? 0) / total * 100);
  const inW = Math.round((india ?? 0) / total * 100);
  const arW = 100 - usW - inW;
  return (
    <div style={{ display:"flex", height:6, width:80, borderRadius:3, overflow:"hidden", background:"var(--color-background-secondary)", flexShrink:0 }}>
      {usW > 0 && <div style={{ width:usW+"%", background:"#185FA5" }} />}
      {inW > 0 && <div style={{ width:inW+"%", background:"#009CA6" }} />}
      {arW > 0 && <div style={{ width:arW+"%", background:"#B45309" }} />}
    </div>
  );
}
