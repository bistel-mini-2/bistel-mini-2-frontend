// =========================================================================
// 도담 — 면책 문구 (결과/답변 하단 작은 회색 안내)
// =========================================================================
import Icon from "@/app/components/Icon";
import { DISCLAIMER_TEXT } from "@/app/data/constants";

export default function DisclaimerNote({ text, className = "" }) {
  return (
    <p className={"dd-disclaimer mb-0 " + className}>
      <Icon name="ShieldCheck" size={13} />
      {text || DISCLAIMER_TEXT}
    </p>
  );
}
