import Link from "next/link";
export default function NotFound() {
  return (
    <main className="shell narrow">
      <section className="card">
        <h1>페이지를 찾을 수 없습니다</h1>
        <p>주소를 확인하거나 처음부터 다시 시작해 주세요.</p>
        <Link className="button primary" href="/">
          처음으로
        </Link>
      </section>
    </main>
  );
}
