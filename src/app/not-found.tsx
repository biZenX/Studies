import Link from "next/link";

export default function NotFound() {
  return (
    <div className="card mx-auto flex max-w-lg flex-col items-center px-6 py-16 text-center">
      <p className="num text-5xl font-extrabold text-[var(--navy)]">404</p>
      <h1 className="mt-3 text-lg font-extrabold text-[var(--text)]">
        هذه الصفحة غير موجودة
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-[var(--text-secondary)]">
        الرابط الذي فتحته غير صحيح أو تم نقل الصفحة. يمكنك العودة إلى قائمة الدراسات.
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary text-sm font-bold">
          العودة للدراسات
        </Link>
      </div>
    </div>
  );
}
