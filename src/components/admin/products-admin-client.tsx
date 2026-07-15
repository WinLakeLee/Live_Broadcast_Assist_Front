"use client";
import { useCallback, useState } from "react";
import { KeyRound, Plus, Save } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { AdminProductInput, Product } from "@/lib/api/contracts";
import { getAdminProducts, saveAdminProduct } from "@/lib/api/admin";
import { ApiError } from "@/lib/api/errors";
import { formatMoney } from "@/lib/format";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
const schema = z.object({
  product_name: z.string().trim().min(1, "상품명을 입력해 주세요."),
  unit_price: z.number().int().positive("단가는 1원 이상이어야 합니다."),
  stock_limit: z.number().int().nonnegative(),
  active: z.boolean(),
  display_order: z
    .number()
    .int()
    .min(0)
    .max(1_000_000, "표시순서는 0~1,000,000이어야 합니다."),
});
type Form = z.infer<typeof schema>;
const blank: Form = {
  product_name: "",
  unit_price: 1,
  stock_limit: 0,
  active: true,
  display_order: 1,
};
export function ProductsAdminClient() {
  const [key, setKey] = useState("");
  const [verified, setVerified] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selected, setSelected] = useState<Product>();
  const [pending, setPending] = useState<AdminProductInput>();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const form = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: blank,
  });
  const load = useCallback(async () => {
    if (!key || busy) return;
    setBusy(true);
    setMessage("");
    try {
      const data = await getAdminProducts(key);
      setProducts(data.sort((a, b) => a.display_order - b.display_order));
      setVerified(true);
    } catch {
      setVerified(false);
      setMessage("관리자 인증 또는 상품 목록 조회에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }, [key, busy]);
  const choose = (p?: Product) => {
    setSelected(p);
    form.reset(
      p
        ? {
            product_name: p.product_name,
            unit_price: p.unit_price,
            stock_limit: p.stock_limit,
            active: p.active,
            display_order: p.display_order,
          }
        : blank,
    );
  };
  const prepare = form.handleSubmit((value) => {
    if (selected && value.stock_limit < selected.reserved_quantity) {
      setMessage(
        "현재 예약수량보다 총 재고를 작게 입력했습니다. 서버에서도 저장을 거부합니다.",
      );
    }
    setPending(value);
  });
  const save = async () => {
    if (!pending || busy) return;
    setBusy(true);
    setMessage("");
    try {
      await saveAdminProduct(key, pending);
      setPending(undefined);
      setMessage("상품을 저장했습니다.");
      const data = await getAdminProducts(key);
      setProducts(data.sort((a, b) => a.display_order - b.display_order));
      const updated = data.find((p) => p.product_name === pending.product_name);
      choose(updated);
    } catch (e) {
      const api = e instanceof ApiError ? e : null;
      setPending(undefined);
      setMessage(
        api?.httpStatus === 409
          ? "예약수량보다 총 재고를 작게 줄일 수 없습니다. 최신 상품 정보를 다시 확인해 주세요."
          : "상품을 저장하지 못했습니다. 관리자 키와 입력값을 확인해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };
  if (!verified)
    return (
      <section className="card">
        <KeyRound aria-hidden="true" />
        <h2>관리자 API 키</h2>
        <p>
          키는 현재 화면의 메모리에만 보관되며 URL·브라우저 저장소·환경변수에
          저장하지 않습니다.
        </p>
        <div className="field">
          <label htmlFor="admin-key">API 키</label>
          <input
            id="admin-key"
            type="password"
            autoComplete="current-password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </div>
        {message && (
          <div className="notice error" role="alert">
            {message}
          </div>
        )}
        <button
          className="button primary"
          disabled={!key || busy}
          onClick={load}
        >
          {busy ? "확인 중…" : "키 확인 및 상품 조회"}
        </button>
      </section>
    );
  return (
    <>
      <section className="card">
        <div className="actions">
          <button className="button" onClick={() => choose()}>
            <Plus size={17} /> 새 상품
          </button>
          <button
            className="button danger"
            onClick={() => {
              setVerified(false);
              setKey("");
              setProducts([]);
            }}
          >
            키 지우기
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>상품명</th>
                <th>단가</th>
                <th>총 재고</th>
                <th>예약</th>
                <th>구매 가능</th>
                <th>판매</th>
                <th>순서</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr
                  className="selectable"
                  tabIndex={0}
                  key={p.product_name}
                  onClick={() => choose(p)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") choose(p);
                  }}
                >
                  <td>{p.product_name}</td>
                  <td>{formatMoney(p.unit_price)}</td>
                  <td>{p.stock_limit}</td>
                  <td>{p.reserved_quantity}</td>
                  <td>{p.available_quantity}</td>
                  <td>{p.active ? "판매" : "중지"}</td>
                  <td>{p.display_order}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <form className="card" onSubmit={prepare}>
        <h2>{selected ? `${selected.product_name} 수정` : "상품 추가"}</h2>
        <p className="muted">
          예약수량은 조회만 가능하며 총 재고를 예약수량보다 낮출 수 없습니다.
          최종 판정은 서버가 수행합니다.
        </p>
        <div className="lookup-grid">
          <div className="field">
            <label htmlFor="product_name">상품명</label>
            <input
              id="product_name"
              readOnly={Boolean(selected)}
              {...form.register("product_name")}
            />
          </div>
          <div className="field">
            <label htmlFor="unit_price">단가</label>
            <input
              id="unit_price"
              type="number"
              min="0"
              {...form.register("unit_price", { valueAsNumber: true })}
            />
          </div>
          <div className="field">
            <label htmlFor="stock_limit">총 재고</label>
            <input
              id="stock_limit"
              type="number"
              min="0"
              {...form.register("stock_limit", { valueAsNumber: true })}
            />
          </div>
          <div className="field">
            <label htmlFor="display_order">표시순서</label>
            <input
              id="display_order"
              type="number"
              {...form.register("display_order", { valueAsNumber: true })}
            />
          </div>
        </div>
        <div className="field check">
          <label>
            <input type="checkbox" {...form.register("active")} />
            판매 활성화
          </label>
        </div>
        {Object.values(form.formState.errors).map((error, i) => (
          <p className="error-text" key={i}>
            {error.message}
          </p>
        ))}
        {message && (
          <div
            className={
              message.includes("저장했습니다")
                ? "notice success"
                : "notice error"
            }
            role="status"
          >
            {message}
          </div>
        )}
        <button className="button primary" disabled={busy}>
          <Save size={17} /> 저장 전 변경 확인
        </button>
      </form>
      {pending && (
        <ConfirmDialog
          title="상품 변경을 저장할까요?"
          onCancel={() => setPending(undefined)}
          onConfirm={save}
        >
          <div className="summary-row">
            <span>상품명</span>
            <strong>{pending.product_name}</strong>
          </div>
          <div className="summary-row">
            <span>단가</span>
            <strong>{formatMoney(pending.unit_price)}</strong>
          </div>
          <div className="summary-row">
            <span>총 재고</span>
            <strong>{pending.stock_limit}</strong>
          </div>
          <div className="summary-row">
            <span>판매 여부 / 순서</span>
            <strong>
              {pending.active ? "판매" : "중지"} / {pending.display_order}
            </strong>
          </div>
        </ConfirmDialog>
      )}
    </>
  );
}
