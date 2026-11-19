import type { Locale } from '../i18n/messages';

export type PolicySection = {
  id: string;
  title: string;
  paragraphs?: string[];
  items?: { label: string; text: string }[];
  links?: { label: string; href: string }[];
};

export type PrivacyCopy = {
  title: string;
  lead: string;
  draftTitle: string;
  draftNote: string;
  updated: string;
  effective: string;
  notSet: string;
  operator: string;
  contact: string;
  country: string;
  korea: string;
  contents: string;
  contactTitle: string;
  contactNote: string;
  sections: PolicySection[];
};

export const privacyCopies: Record<Locale, PrivacyCopy> = {
  ko: {
    title: '개인정보 처리방침',
    lead: '리모리(Remory)의 웹·앱 서비스에서 어떤 정보를 왜 처리하고, 어디에 보관하며, 어떻게 삭제할 수 있는지 안내합니다.',
    draftTitle: '운영 정보 확인 중인 초안입니다',
    draftNote: '운영자·문의처·시행일 및 아래에 확인 중으로 표시한 운영 사항은 정식 서비스 공개 전에 확정합니다. 이 문서는 현재 기능을 기준으로 작성한 개발 단계의 초안입니다.',
    updated: '마지막 수정', effective: '시행일', notSet: '확인 중',
    operator: '운영자·개인정보 보호 담당자', contact: '개인정보 문의 이메일', country: '계정·학습 DB의 보관 국가',
    korea: '대한민국 (직접 운영 예정)',
    contents: '내용 바로가기', contactTitle: '개인정보 관련 문의',
    contactNote: '개인정보의 열람·정정·삭제·처리정지 및 기타 문의는 위 연락처로 요청할 수 있습니다. 문의에 필요한 최소한의 정보만 보내고, 비밀번호나 인증코드는 보내지 마세요.',
    sections: [
      { id: 'collection', title: '처리하는 정보', items: [
        { label: '이메일 계정', text: '이메일 주소, 비밀번호의 일방향 해시, 서비스 내부 계정 ID와 생성 시각을 처리합니다. 비밀번호 원문을 DB에 저장하지 않습니다.' },
        { label: 'Google 로그인 선택 시', text: 'Google에서 확인된 이메일과 계정 식별값(sub), 연결 정보와 연결 시각을 저장합니다. 인증 응답은 확인에 사용하며 이름·프로필 사진과 Google 비밀번호를 리모리 계정 정보로 저장하지 않습니다.' },
        { label: '학습 내용과 기록', text: '덱 이름·설명·유형·테마, 카드 질문·답·보기·유형, 다음 복습일·복습 횟수, 복습 평가·시각·모드를 처리합니다. 카드에 비밀번호, 주민등록번호, 민감한 정보나 타인의 개인정보를 입력하지 마세요.' },
        { label: '로그인 유지와 보안', text: '무작위 인증값의 해시, 계정과 기기별 로그인 연결값, 만료·사용 시각을 보관합니다. Google 로그인 요청에는 일회용 인증값과 브라우저 확인값의 해시를 사용합니다.' },
        { label: '비밀번호 재설정', text: '입력한 이메일, 선택 언어, 요청 식별값·인증코드·변경 권한의 해시, 시각과 실패 횟수를 처리합니다. 요청 IP 주소는 통신과 남용 방지에 사용하며, 요청 제한 DB에는 이메일·IP 주소에서 만든 해시와 횟수·만료 시각을 저장합니다. 해시는 익명정보로 단정하지 않습니다.' },
      ] },
      { id: 'purpose', title: '처리 목적과 이용 범위', paragraphs: [
        '계정 생성·본인 확인·로그인 유지, 학습 내용 저장·동기화, 카드별 복습일 계산, 학습 통계와 캘린더 제공, 계정 복구 및 인증 요청 남용 방지를 위해 정보를 처리합니다.',
        '회원 서비스 제공에 필요한 처리는 개인정보 보호법 제15조 제1항 제4호의 계약 체결·이행을 위한 처리를 기준으로 검토합니다. Google 연결과 비회원 기록 가져오기는 이용자의 선택에 따라 진행합니다. 별도 동의가 필요한 처리는 해당 내용을 구분해 안내하고 필요한 동의를 받습니다.',
        '현재 리모리에는 광고·결제·맞춤 광고 또는 별도의 이용자 행동 분석 도구가 연결되어 있지 않습니다. 전화번호·주소·연락처·정밀 위치를 필수 가입 항목으로 요구하지 않습니다.',
      ] },
      { id: 'guest', title: '비회원 기록과 엑셀 파일', paragraphs: [
        '비회원의 덱·카드·복습 기록은 해당 브라우저 또는 앱의 기기 저장소에 보관합니다. 비회원으로 입력한 학습 내용은 계정에 자동 전송하지 않습니다.',
        '로그인·회원가입 시 기본 선택은 “이 기기에 남겨두기”입니다. 이 경우 계정에 기록을 추가하지 않고, 로그아웃하면 기기에 남겨 둔 기록을 다시 이용할 수 있습니다. “계정에 가져오기”를 선택한 경우에만 기존 계정 기록에 합칩니다. 저장과 조회 성공을 확인한 뒤 기기의 해당 기록을 비우며, 실패하면 기기 기록을 유지합니다. 자동 로그인 복원에서도 가져오지 않은 기록을 자동 이관하지 않습니다.',
        '엑셀 파일은 기기에서 읽습니다. 원본 파일 자체를 서버에 업로드하지 않으며, 회원 상태에서 등록을 완료하거나 가져오기를 선택한 카드 내용은 계정 저장을 위해 서버로 전송합니다.',
      ] },
      { id: 'retention', title: '보관 기간', items: [
        { label: '계정·Google 연결 정보', text: '회원탈퇴 또는 해당 정보의 삭제가 완료될 때까지 보관합니다.' },
        { label: '계정의 덱·카드·복습 기록', text: '이용자가 카드·덱을 삭제하거나 탈퇴할 때까지 보관합니다. 카드·덱 삭제 시 연결된 복습 기록도 함께 삭제합니다.' },
        { label: '비회원 기록·환경 설정', text: '이용자가 기기에서 지우거나 브라우저·앱의 저장 정책에 따라 삭제될 때까지 보관합니다. 계정으로 가져오기를 완료한 비회원 기록은 기기에서 정리합니다.' },
        { label: '로그인 권한', text: '접근 권한은 15분, 현재의 로그인 갱신 권한은 로그아웃·비밀번호 재설정·탈퇴 또는 보안상 폐기 시까지 유지합니다. 이미 사용한 갱신값의 재사용 탐지 이력은 30일 후 만료됩니다. 미사용 기간만으로 서버의 현재 로그인 권한을 만료시키지는 않습니다.' },
        { label: '임시 인증·요청 제한 정보', text: 'Google 일회용 요청은 5분, 비밀번호 인증코드는 10분, 코드 확인 후 변경 권한은 5분 동안 유효합니다. 요청 제한 정보는 1분 또는 1시간 단위로 만료됩니다. 임시 권한은 사용 완료 시 소모하거나 만료되며, 만료된 DB 기록은 서버의 6시간 주기 정리 작업에서 삭제합니다.' },
        { label: '접속 로그·백업·발송 메일', text: '운영 인프라의 접속 로그, 별도 백업, 발송 서비스에 남는 메일과 관련 기록의 보관·삭제 기간은 정식 공개 전에 확인해 명시합니다. 현재 이 초안은 임의의 기간이나 모든 복제본의 즉시 삭제를 보장하지 않습니다.' },
      ] },
      { id: 'providers', title: '외부 서비스와 처리위탁', paragraphs: [
        '리모리는 다음 외부 서비스를 사용합니다. 로그인 기능과 메일 발송을 위한 처리를 광고·판매 목적의 제공과 구분합니다. 이용자 정보를 판매하거나 광고 목적으로 제공하는 기능은 현재 운영하지 않습니다.',
      ], items: [
        { label: 'Google 로그인', text: 'Google Identity Services로 로그인·계정 연결·Google 계정의 탈퇴 본인 확인을 진행합니다. 로그인 창에서 Google 구성요소를 불러올 때도 Google이 IP 주소·브라우저 정보 등을 직접 수집하거나 자체 쿠키를 사용할 수 있습니다. Google 비밀번호는 리모리가 받지 않습니다.' },
        { label: '인증메일 발송', text: '현재 설정은 Google Gmail SMTP를 사용합니다. 비밀번호 재설정 메일을 보낼 때 수신 이메일과 인증코드가 포함된 메일 내용을 발송 서비스가 처리합니다. 덱·카드·복습 기록은 이 메일에 포함하지 않습니다.' },
        { label: '운영 인프라', text: '계정·학습 DB는 대한민국의 직접 운영 서버에 보관할 예정입니다. 외부 호스팅 업체는 선정하지 않았습니다. 외부 업체를 사용하게 되면 수탁자·업무 범위·재위탁·보관 조건을 확인해 반영합니다.' },
      ], links: [{ label: 'Google 개인정보처리방침', href: 'https://policies.google.com/privacy?hl=ko' }] },
      { id: 'overseas', title: '국외 처리에 관한 사항', paragraphs: [
        'Google 로그인과 Gmail 메일 발송에는 국외 사업자의 시스템이 사용됩니다. Google은 여러 국가에서 정보를 처리할 수 있다고 안내합니다. 기기에서 Google이 직접 수집하는 정보와 리모리 서버가 메일 발송을 위해 전달하는 정보는 서로 다른 처리 흐름입니다.',
        '국외 이전에 해당하는 처리의 수령 법인·연락처, 국가, 항목, 시점·방법, 목적·보유기간, 법적 근거와 거부 방법·영향은 운영 계약과 실제 경로를 확인한 뒤 구체적으로 확정할 항목입니다. 이 부분이 확인되기 전에는 본 문서를 국외 이전 고지가 완료된 정식 방침으로 사용하지 않습니다.',
        'Google 로그인을 선택하지 않아도 이메일 방식으로 가입·로그인할 수 있습니다. 다만 현재 로그인 창에서는 Google 구성요소를 함께 불러옵니다. 인증메일을 받지 않으면 이메일 인증코드를 통한 비밀번호 재설정은 이용할 수 없습니다.',
      ] },
      { id: 'storage', title: '쿠키와 기기 저장소', paragraphs: [
        '로그인 유지용 remory_refresh 쿠키는 HttpOnly·SameSite=Lax로 설정하고, HTTPS 환경에서는 Secure를 적용합니다. 브라우저 보관 기간은 400일로 발급하고 갱신할 때마다 연장합니다. 브라우저 정책으로 먼저 삭제될 수 있습니다. Google 요청을 브라우저와 연결하는 remory_google_browser 쿠키는 1시간으로 설정합니다.',
        '기기 저장소에는 비회원 학습 내용, 테마·언어 설정, 계정 표시용 이메일·ID·연결 상태, 탭 간 로그인 변경 알림과 미완료 로그아웃 표시가 저장될 수 있습니다. 접근 토큰은 메모리에서 사용하고, 이전 버전의 로그인 저장정보는 전환 과정에서 정리합니다. 앱을 열기 위한 화면 파일과 이미지 등은 브라우저 캐시에 보관할 수 있습니다.',
        '브라우저 설정에서 쿠키를 차단하거나 사이트 데이터를 지울 수 있습니다. 차단하면 로그인·자동 갱신이 제한될 수 있으며, 기기 데이터를 지우거나 앱을 삭제하면 비회원 기록이 없어질 수 있습니다. 서버에 저장한 회원 기록은 다시 로그인해 불러올 수 있습니다.',
      ] },
      { id: 'deletion', title: '삭제와 파기 방법', paragraphs: [
        '계정 삭제가 성공하면 운영 DB의 계정, 비밀번호 해시, Google 연결, 로그인 권한, 덱·카드·복습 기록과 계정에 연결된 이전 학습 저장자료를 함께 삭제합니다. 전자적 기록을 삭제하는 방식으로 처리하며, 계정에 연결된 로그인 권한도 해제합니다.',
        '로그아웃만으로 계정의 학습 기록이 삭제되지는 않습니다. 회원탈퇴도 계정으로 가져오지 않고 기기에 남겨 둔 비회원 기록이나 Google 계정 자체를 삭제하지 않습니다. 기기 기록은 해당 기기의 사이트·앱 데이터 관리에서 별도로 지울 수 있습니다.',
        '외부 서비스의 메일·로그나 별도 백업의 잔존 자료는 운영 DB와 구분하여 보관·삭제 조건을 확정합니다. 법령상 보존이 필요한 자료가 생기는 경우에는 그 근거·항목·기간과 분리 보관 방법을 구체적으로 안내합니다.',
      ] },
      { id: 'rights', title: '이용자와 법정대리인의 권리', paragraphs: [
        '이용자와 적법한 대리인은 관련 법령에 따라 개인정보의 열람, 정정·삭제, 처리정지와 동의 철회를 요청할 수 있습니다. 요청 처리에 필요한 범위에서 본인 또는 대리 권한을 확인할 수 있습니다.',
        '덱·카드의 조회·수정·삭제는 앱에서 진행할 수 있습니다. 계정 삭제는 설정의 회원탈퇴 또는 로그인 없이 접근할 수 있는 아래 웹 탈퇴 화면에서 본인 확인 후 진행합니다. 이메일 주소의 정정처럼 앱에 직접 제공되지 않는 요청은 개인정보 문의처로 연락해 주세요.',
      ], links: [
        { label: '웹에서 계정 삭제', href: '/account-deletion/' },
        { label: '개인정보침해신고센터', href: 'https://privacy.kisa.or.kr/' },
        { label: '개인정보분쟁조정위원회', href: 'https://www.kopico.go.kr/' },
      ] },
      { id: 'security', title: '안전하게 처리하기 위한 조치', paragraphs: [
        '비밀번호는 일방향 해시로 저장하고 로그인·재설정 권한은 DB에 원문 대신 해시로 보관합니다. 계정별 접근 검사, 일회용 인증값, 인증 요청 제한과 권한 폐기를 적용합니다.',
        '정식 운영 시 암호화 통신, 운영 접근 권한, 접속 로그 관리와 백업 보호 조치 등 실제 배포 환경의 보호 조치를 확정합니다. 이 초안은 아직 확인하지 않은 저장장치 전체 암호화나 외부 보안 인증을 적용한 것으로 표시하지 않습니다.',
      ] },
      { id: 'children', title: '아동 개인정보', paragraphs: [
        '만 14세 미만 이용자에 대한 서비스 제공 범위와 법정대리인 동의·권리 행사 절차는 정식 공개 전에 확정할 사항입니다. 현재 초안은 연령 확인이나 법정대리인 동의 절차를 이미 운영하고 있다고 설명하지 않습니다.',
      ] },
      { id: 'changes', title: '처리방침의 변경', paragraphs: [
        '본 문서는 현재 기능을 기준으로 작성했습니다. 정식 시행일은 운영 정보와 확인 사항을 확정한 뒤 표시합니다. 수집 항목·목적·외부 서비스·보관 방식 등이 달라지면 변경 내용과 적용일을 이 페이지에서 안내하고, 별도 고지나 동의가 필요한 경우 해당 절차를 진행합니다.',
      ] },
    ],
  },
  en: {
    title: 'Privacy Policy',
    lead: 'This notice explains what Remory’s web and app services process, why they process it, where it is kept and how you can delete it.',
    draftTitle: 'Draft — operational details are being confirmed',
    draftNote: 'The operator, contact, effective date and operational details marked as unconfirmed must be finalized before public launch. This development draft describes the current features.',
    updated: 'Last updated', effective: 'Effective date', notSet: 'To be confirmed',
    operator: 'Operator and privacy contact', contact: 'Privacy email', country: 'Country storing account and study databases',
    korea: 'South Korea (self-hosting planned)',
    contents: 'On this page', contactTitle: 'Privacy enquiries',
    contactNote: 'Use the contact above for access, correction, deletion, restriction and other privacy requests. Include only necessary information; never send passwords or verification codes.',
    sections: [
      { id: 'collection', title: 'Information processed', items: [
        { label: 'Email accounts', text: 'Email address, a one-way password hash, internal account ID and creation time. The database does not store the original password.' },
        { label: 'Optional Google sign-in', text: 'Verified email, Google account identifier (sub), linking details and time. Authentication responses are checked; names, profile pictures and Google passwords are not stored as Remory account information.' },
        { label: 'Study content and history', text: 'Deck names, descriptions, types and themes; card questions, answers, choices and types; next review dates and counts; review ratings, times and modes. Do not enter passwords, government IDs, sensitive details or other people’s personal information in cards.' },
        { label: 'Persistent sign-in and security', text: 'Hashes of random authentication values, links between an account and device session, expiry and use times. Google requests use one-time authentication and browser-verification hashes.' },
        { label: 'Password recovery', text: 'Submitted email and language; hashes of request IDs, codes and reset grants; timestamps and failed attempts. Request IP addresses are used for communication and abuse prevention. Rate-limit records store hashes derived from emails and IP addresses, counts and expiry times. Hashes are not assumed to be anonymous.' },
      ] },
      { id: 'purpose', title: 'Purposes and scope', paragraphs: [
        'Information supports accounts and authentication, persistent sign-in, saving and syncing study content, per-card review scheduling, statistics and calendars, password recovery and prevention of authentication abuse.',
        'Processing necessary to provide member services is assessed under the contract basis in Article 15(1)(4) of Korea’s Personal Information Protection Act. Google linking and guest imports follow your choice. Processing requiring separate consent must be explained separately and the necessary consent obtained.',
        'Remory currently has no advertising, payments, personalized advertising or separate behavioral analytics integration. Phone numbers, addresses, contacts and precise location are not required signup fields.',
      ] },
      { id: 'guest', title: 'Guest records and Excel files', paragraphs: [
        'Guest decks, cards and review history are stored in the browser or app storage on that device. Guest study content is not automatically sent to an account.',
        'The default at login or signup is “Keep on this device”. Those records stay separate and are available again after signing out. Only “Bring into my account” adds them to existing account records. Local imported records are cleared after successful saving and retrieval; they remain if import fails. Restoring a login does not automatically import retained guest records.',
        'Excel files are read on the device. The original file is not uploaded. Card content you register while signed in or explicitly import is sent to save it to your account.',
      ] },
      { id: 'retention', title: 'Retention', items: [
        { label: 'Accounts and Google links', text: 'Kept until account or relevant information deletion is completed.' },
        { label: 'Account study records', text: 'Kept until you delete the relevant card or deck or delete your account. Deleting a card or deck also deletes its linked review history.' },
        { label: 'Guest records and preferences', text: 'Kept until you remove them or browser/app storage policies remove them. Successfully imported guest records are cleared locally.' },
        { label: 'Authentication', text: 'Access grants last 15 minutes. Current refresh grants remain until logout, password reset, account deletion or security revocation; server inactivity alone does not expire them. Used refresh-token replay history expires after 30 days.' },
        { label: 'Temporary security records', text: 'Google challenges last 5 minutes, reset codes 10 minutes and verified reset grants 5 minutes. Request limits expire in 1-minute or 1-hour buckets. Grants are consumed or expire; expired database records are removed by server cleanup scheduled every 6 hours.' },
        { label: 'Access logs, backups and sent mail', text: 'Retention and deletion of infrastructure logs, separate backups and mail-provider copies must be confirmed before launch. This draft does not invent periods or promise immediate deletion of every replica.' },
      ] },
      { id: 'providers', title: 'External services and processors', paragraphs: [
        'The following services support authentication and mail delivery. These uses are distinct from sales or advertising disclosure. Remory currently has no feature selling information or providing it for advertising.',
      ], items: [
        { label: 'Google sign-in', text: 'Google Identity Services supports sign-in, linking and identity confirmation for Google-account deletion. Loading its components on the login screen may allow Google to collect IP/browser information directly or use its own cookies. Remory does not receive your Google password.' },
        { label: 'Verification mail', text: 'The current setup uses Google Gmail SMTP. The provider processes recipient email and mail containing a password-reset code. Decks, cards and review history are not included in those messages.' },
        { label: 'Hosting', text: 'Account and study databases are planned for a self-hosted server in South Korea. No external host has been selected. If one is used, its identity, tasks, subprocessors and retention terms will be confirmed and disclosed.' },
      ], links: [{ label: 'Google Privacy Policy', href: 'https://policies.google.com/privacy?hl=en' }] },
      { id: 'overseas', title: 'International processing', paragraphs: [
        'Google sign-in and Gmail delivery use overseas-provider systems. Google states that information may be processed in multiple countries. Google’s direct collection from a device differs from information Remory sends for email delivery.',
        'For processing that constitutes an international transfer, recipient entity/contact, countries, data, timing/method, purposes, retention, legal basis and refusal method/consequences must be confirmed against actual contracts and routes. Until then, this document is not a finalized international-transfer notice.',
        'Email signup and sign-in are available without choosing Google sign-in, although the current login screen also loads Google components. Without receiving verification mail, email-code password recovery is unavailable.',
      ] },
      { id: 'storage', title: 'Cookies and device storage', paragraphs: [
        'The remory_refresh cookie uses HttpOnly and SameSite=Lax, with Secure on HTTPS. Its browser lifetime is 400 days, renewed on refresh; browsers can remove it sooner. The remory_google_browser browser-linking cookie is set for 1 hour.',
        'Device storage can contain guest study content, theme/language preferences, display-only account email/ID/linking status, cross-tab authentication notifications and a pending-logout flag. Access tokens stay in memory. Legacy login storage is cleared during transition. App-screen files and images can be cached locally.',
        'You can block cookies or clear site data in browser settings. Blocking can limit login and refresh. Clearing device data or uninstalling the app can remove guest records. Account records saved to the server can be retrieved by signing in again.',
      ] },
      { id: 'deletion', title: 'Deletion and disposal', paragraphs: [
        'Successful account deletion removes the operational database account, password hash, Google link, login grants, decks, cards, reviews and linked legacy study storage. Electronic records are deleted and associated authentication is revoked.',
        'Logging out does not delete account study records. Account deletion does not delete guest records you kept separately on the device or your Google account. Device records can be removed through that device’s site/app data controls.',
        'Residual mail, external logs and separate backups need defined retention/deletion terms distinct from the operational database. If a legal retention obligation arises, its basis, information, period and separation method will be specified.',
      ] },
      { id: 'rights', title: 'Your and your representative’s rights', paragraphs: [
        'Under applicable law, you or an authorized representative may request access, correction/deletion, restriction and withdrawal of consent. Identity or representative authority may be verified only as needed to handle the request.',
        'View, edit and delete decks/cards in the app. Delete your account through Settings or the publicly accessible web deletion page below, after identity verification. Contact the privacy address for requests without an in-app control, such as email correction.',
      ], links: [
        { label: 'Delete an account on the web', href: '/account-deletion/' },
        { label: 'KISA Privacy Infringement Reporting Center', href: 'https://privacy.kisa.or.kr/' },
        { label: 'Personal Information Dispute Mediation Committee', href: 'https://www.kopico.go.kr/' },
      ] },
      { id: 'security', title: 'Protection measures', paragraphs: [
        'Passwords use one-way hashes. Authentication and reset grants are stored as hashes rather than original values. Account-scoped access checks, one-time authentication, request limits and grant revocation are applied.',
        'Deployment safeguards, including encrypted transport, operational access, log management and backup protection, must be finalized for public operation. This draft does not claim unverified full-disk encryption or external security certification.',
      ] },
      { id: 'children', title: 'Children’s information', paragraphs: [
        'Service eligibility for children under 14 and guardian consent/rights procedures must be finalized before public launch. This draft does not claim that age verification or guardian consent is already implemented.',
      ] },
      { id: 'changes', title: 'Changes to this policy', paragraphs: [
        'This document reflects current features. An effective date will be provided after operational details are confirmed. Changes to data, purposes, providers or retention will be explained here with their application date; separate notices or consent will be handled where required. Translations aid understanding; the Korean text is the reference version.',
      ] },
    ],
  },
  ja: {
    title: 'プライバシーポリシー',
    lead: 'Remoryのウェブ・アプリが取り扱う情報、目的、保存場所、削除方法について説明します。',
    draftTitle: '運営情報を確認中の草案です',
    draftNote: '運営者・連絡先・施行日および確認中の運営事項は正式公開前に確定します。現在の機能に基づく開発段階の草案です。',
    updated: '最終更新', effective: '施行日', notSet: '確認中',
    operator: '運営者・個人情報担当者', contact: '個人情報に関するメール窓口', country: 'アカウント・学習DBの保存国',
    korea: '韓国（自主管理サーバーで運用予定）',
    contents: '目次', contactTitle: '個人情報のお問い合わせ',
    contactNote: '開示・訂正・削除・処理停止などは上記窓口へご連絡ください。必要最小限の情報のみ送り、パスワードや認証コードは送らないでください。',
    sections: [
      { id: 'collection', title: '取り扱う情報', items: [
        { label: 'メールアカウント', text: 'メールアドレス、パスワードの一方向ハッシュ、内部アカウントID、作成日時。元のパスワードはDBに保存しません。' },
        { label: '任意のGoogleログイン', text: '確認済みメール、Google識別値（sub）、連携情報と日時を保存します。認証応答を検証し、氏名・プロフィール画像・GoogleパスワードをRemoryのアカウント情報として保存しません。' },
        { label: '学習内容・履歴', text: 'デッキの名前・説明・種類・テーマ、カードの質問・答え・選択肢・種類、復習予定・回数、評価・日時・モードを取り扱います。パスワード、公的識別番号、機微情報、他人の個人情報をカードに入力しないでください。' },
        { label: 'ログイン維持・安全対策', text: 'ランダムな認証値のハッシュ、アカウントと端末セッションの関連値、有効期限・使用日時を保存します。Google認証では一回限りの認証値とブラウザー確認値のハッシュを使います。' },
        { label: 'パスワード再設定', text: '入力メール・言語、要求ID・コード・変更権限のハッシュ、日時・失敗回数を処理します。IPアドレスは通信と不正防止に使い、制限DBにはメール・IPから作ったハッシュ、回数、有効期限を保存します。ハッシュを匿名情報と断定しません。' },
      ] },
      { id: 'purpose', title: '利用目的と範囲', paragraphs: [
        'アカウント作成・本人確認・ログイン維持、学習内容の保存と同期、カード別の復習予定、統計・カレンダー、アカウント復旧、認証の不正利用防止に使用します。',
        '会員サービスに必要な処理は韓国の個人情報保護法第15条第1項第4号の契約締結・履行を基準に検討します。Google連携とゲスト記録の取り込みは利用者の選択に従います。別途同意が必要な処理は区別して案内し、必要な同意を得ます。',
        '現在、広告・決済・パーソナライズ広告・独立した行動分析ツールは導入していません。電話番号・住所・連絡先・正確な位置情報を登録必須項目として求めません。',
      ] },
      { id: 'guest', title: 'ゲスト記録とExcelファイル', paragraphs: [
        'ゲストのデッキ・カード・復習履歴はその端末のブラウザーまたはアプリ内に保存します。学習内容をアカウントに自動送信しません。',
        'ログイン・登録時の初期選択は「この端末に残す」です。アカウントと分けて保管し、ログアウト後にまた利用できます。「アカウントに取り込む」を選んだ場合だけ既存記録に追加します。保存と取得の成功後に端末の対象記録を消し、失敗時は残します。自動ログインの復元でも未取り込み記録を自動移行しません。',
        'Excelは端末で読み込み、元ファイルをアップロードしません。ログイン中に登録したカードや選択して取り込むカードの内容は、アカウント保存のため送信します。',
      ] },
      { id: 'retention', title: '保存期間', items: [
        { label: 'アカウント・Google連携', text: '退会または対象情報の削除完了まで保存します。' },
        { label: '会員の学習記録', text: 'カード・デッキの削除または退会まで保存します。カード・デッキを削除すると関連する復習履歴も削除します。' },
        { label: 'ゲスト記録・設定', text: '利用者による消去またはブラウザー・アプリの保存方針による削除まで保存します。取り込み済みのゲスト記録は端末で整理します。' },
        { label: 'ログイン権限', text: 'アクセス権限は15分。現在の更新権限はログアウト・パスワード再設定・退会・安全上の失効まで維持し、未使用期間のみでは失効しません。使用済み更新値の再利用検知履歴は30日後に期限切れになります。' },
        { label: '一時認証・要求制限', text: 'Google要求は5分、再設定コードは10分、確認後の変更権限は5分、要求制限は1分または1時間の区切りで有効です。使用または期限切れで権限を失効させ、期限切れDB記録はサーバーの6時間ごとの整理で削除します。' },
        { label: 'アクセスログ・バックアップ・送信メール', text: '運営ログ、別のバックアップ、メール事業者に残る資料の保存・削除期間は公開前に確定します。任意の期間や全複製の即時削除は保証していません。' },
      ] },
      { id: 'providers', title: '外部サービスと委託', paragraphs: [
        '以下は認証とメール配送のための外部サービスです。広告や販売のための提供と区別します。現在、情報を販売または広告目的で提供する機能はありません。',
      ], items: [
        { label: 'Googleログイン', text: 'Google Identity Servicesでログイン・連携・Google会員の退会時確認を行います。ログイン画面で部品を読み込む際もGoogleがIP・ブラウザー情報を直接収集し、独自のCookieを使う場合があります。Googleパスワードは受け取りません。' },
        { label: '認証メール', text: '現在はGoogle Gmail SMTPを設定しています。宛先メールと再設定コードを含む本文を配送事業者が処理します。デッキ・カード・復習履歴はメールに含みません。' },
        { label: '運営設備', text: 'アカウント・学習DBは韓国内の自主管理サーバーに保存する予定です。外部ホスティングは未選定です。利用する場合は委託先・業務・再委託・保存条件を確認して案内します。' },
      ], links: [{ label: 'Googleプライバシーポリシー', href: 'https://policies.google.com/privacy?hl=ja' }] },
      { id: 'overseas', title: '国外での処理', paragraphs: [
        'GoogleログインとGmail配送は国外事業者の設備を利用します。Googleは複数の国で処理する場合があると案内しています。端末からGoogleによる直接収集と、Remoryがメール配送のため送信する情報は別の流れです。',
        '国外移転に該当する処理の受領法人・連絡先、国、項目、時点・方法、目的・保存期間、根拠と拒否方法・影響は実契約と経路を確認して確定します。それまでは本書を国外移転の正式な告知として使いません。',
        'Googleログインを選ばずメールで登録・ログインできますが、現在のログイン画面はGoogleの部品も読み込みます。認証メールを受け取らない場合、メールコードによるパスワード再設定は利用できません。',
      ] },
      { id: 'storage', title: 'Cookieと端末保存', paragraphs: [
        'remory_refreshはHttpOnly・SameSite=Lax、HTTPSではSecureを設定します。ブラウザーの保存期間は400日で更新時に延長し、ブラウザーにより早く削除されることがあります。remory_google_browserは1時間です。',
        '端末にはゲスト学習内容、テーマ・言語、表示用アカウントのメール・ID・連携状態、タブ間の認証変更通知と未完了ログアウト情報を保存する場合があります。アクセストークンはメモリーで扱い、旧ログイン保存情報は移行時に整理します。画面ファイルや画像はキャッシュする場合があります。',
        'ブラウザーでCookieを拒否・サイトデータを消去できます。拒否でログイン・更新が制限され、端末データ消去やアプリ削除でゲスト記録を失うことがあります。サーバー保存済みの会員記録は再ログインして取得できます。',
      ] },
      { id: 'deletion', title: '削除と廃棄', paragraphs: [
        '退会成功時に運用DBのアカウント、パスワードハッシュ、Google連携、認証権限、デッキ・カード・復習履歴、関連する旧学習保存資料を電子的に削除し、ログイン権限を失効させます。',
        'ログアウトのみでは会員の学習記録を削除しません。退会でも別に残した端末のゲスト記録やGoogleアカウント自体は削除しません。端末記録はサイト・アプリのデータ管理で別途削除できます。',
        '外部のメール・ログや別のバックアップは運用DBと区別して保存・削除条件を確定します。法令上の保存が必要になった場合は根拠・項目・期間・分離保管方法を案内します。',
      ] },
      { id: 'rights', title: '利用者と法定代理人の権利', paragraphs: [
        '利用者または正当な代理人は適用法令に従い、開示、訂正・削除、処理停止、同意撤回を請求できます。対応に必要な範囲で本人・代理権を確認する場合があります。',
        'デッキ・カードの閲覧・編集・削除はアプリで行えます。退会は設定または下記の公開ウェブ画面で本人確認後に行えます。メール訂正など専用操作のない請求は個人情報窓口へご連絡ください。',
      ], links: [
        { label: 'ウェブから退会', href: '/account-deletion/' },
        { label: '個人情報侵害申告センター', href: 'https://privacy.kisa.or.kr/' },
        { label: '個人情報紛争調整委員会', href: 'https://www.kopico.go.kr/' },
      ] },
      { id: 'security', title: '保護措置', paragraphs: [
        'パスワードを一方向ハッシュ、認証・再設定権限を原値ではなくハッシュで保存します。アカウントごとの権限確認、一回限りの認証、要求制限と権限失効を適用します。',
        '暗号化通信、運営権限、ログ管理、バックアップ保護など配備環境の措置は正式運営時に確定します。未確認のディスク全体暗号化や外部セキュリティ認証の適用を主張しません。',
      ] },
      { id: 'children', title: '児童の情報', paragraphs: [
        '満14歳未満へのサービス提供範囲と保護者同意・権利行使手続きは公開前に確定します。年齢確認や保護者同意をすでに実施しているという草案ではありません。',
      ] },
      { id: 'changes', title: '本方針の変更', paragraphs: [
        '現在の機能を基準とし、運営事項の確定後に正式施行日を表示します。項目・目的・外部サービス・保存方法が変わる際は変更内容と適用日をこのページで案内し、必要に応じ別途告知・同意を行います。翻訳は理解の補助であり韓国語を参照原文とします。',
      ] },
    ],
  },
  'zh-CN': {
    title: '隐私政策',
    lead: '本政策说明Remory网页和应用处理哪些信息、为何处理、如何保存以及如何删除。',
    draftTitle: '草案：运营信息正在确认中',
    draftNote: '运营者、联系方式、生效日期及标记为待确认的运营事项将在正式公开前确定。本开发草案以当前功能为依据。',
    updated: '最后更新', effective: '生效日期', notSet: '待确认',
    operator: '运营者及隐私负责人', contact: '隐私联系邮箱', country: '账号和学习数据库的存储国家',
    korea: '韩国（计划自行运营服务器）',
    contents: '目录', contactTitle: '隐私咨询',
    contactNote: '可通过上述渠道申请查阅、更正、删除、停止处理等。请仅提供必要信息，不要发送密码或验证码。',
    sections: [
      { id: 'collection', title: '处理的信息', items: [
        { label: '邮箱账号', text: '邮箱地址、密码的单向哈希、内部账号ID和创建时间。数据库不保存原始密码。' },
        { label: '可选的Google登录', text: '保存已验证邮箱、Google账号标识（sub）、关联信息和时间。验证认证响应，不将姓名、头像或Google密码保存为Remory账号信息。' },
        { label: '学习内容和记录', text: '卡组名称、说明、类型和主题；卡片问题、答案、选项和类型；下次复习时间、次数；评价、时间和模式。请勿在卡片中填写密码、政府身份号码、敏感信息或他人个人信息。' },
        { label: '保持登录与安全', text: '保存随机认证值的哈希、账号与设备会话关联值、有效期和使用时间。Google请求使用一次性认证值和浏览器验证值的哈希。' },
        { label: '密码重置', text: '处理输入邮箱、语言、请求ID、验证码和重置权限的哈希、时间及失败次数。请求IP用于通信和防止滥用；限流数据库保存根据邮箱/IP生成的哈希、次数和到期时间。不将哈希当然视为匿名信息。' },
      ] },
      { id: 'purpose', title: '处理目的和范围', paragraphs: [
        '用于创建账号、身份验证、保持登录、保存和同步学习内容、计算卡片复习时间、提供统计和日历、恢复账号及防止认证滥用。',
        '提供会员服务所必需的处理以韩国《个人信息保护法》第15条第1款第4项的合同订立和履行为审查依据。Google关联与访客记录导入遵循用户选择。需要另行同意的处理将单独说明并取得必要同意。',
        '当前未接入广告、支付、个性化广告或独立的行为分析工具。注册不要求电话号码、地址、通讯录或精确位置。',
      ] },
      { id: 'guest', title: '访客记录和Excel文件', paragraphs: [
        '访客卡组、卡片和复习记录保存在该设备的浏览器或应用存储中。访客学习内容不会自动发送至账号。',
        '登录或注册时默认选择“保留在此设备”，记录与账号分开，退出登录后可继续使用。只有选择“导入账号”才会合并至现有账号记录。确认保存和读取成功后才清理设备中的对应记录，失败则保留。自动恢复登录也不会导入保留的访客记录。',
        'Excel在设备上读取，不上传原始文件。登录状态下完成注册卡片或明确选择导入的卡片内容会发送到服务器保存。',
      ] },
      { id: 'retention', title: '保存期限', items: [
        { label: '账号及Google关联', text: '保存至注销账号或相关信息删除完成。' },
        { label: '账号学习记录', text: '保存至删除对应卡片、卡组或注销账号。删除卡片或卡组时，一并删除关联复习记录。' },
        { label: '访客记录及偏好', text: '保存至用户删除或浏览器/应用按其存储政策清除。成功导入的访客记录会在设备上清理。' },
        { label: '登录权限', text: '访问权限有效15分钟。当前刷新权限保留至退出登录、重置密码、注销或安全撤销，服务器不会仅因未使用而使其到期。已用刷新值的重用检测历史在30天后到期。' },
        { label: '临时认证和限流', text: 'Google请求有效5分钟、重置验证码10分钟、验证后重置权限5分钟。限流记录按1分钟或1小时区间到期。权限使用后消耗或到期失效；过期数据库记录通过服务器每6小时的清理任务删除。' },
        { label: '访问日志、备份和已发送邮件', text: '运营日志、独立备份及邮件服务商留存资料的保存和删除期限将在公开前确认。本草案不虚构期限，也不承诺所有副本即时删除。' },
      ] },
      { id: 'providers', title: '外部服务和委托处理', paragraphs: [
        '以下外部服务用于认证和邮件发送，与销售或广告用途的提供相区分。当前没有出售信息或为广告提供信息的功能。',
      ], items: [
        { label: 'Google登录', text: '通过Google Identity Services进行登录、关联及Google账号注销身份验证。登录页面加载其组件时，Google也可能直接收集IP、浏览器信息或使用其Cookie。Remory不接收Google密码。' },
        { label: '认证邮件', text: '当前设置使用Google Gmail SMTP。邮件服务商处理收件邮箱及包含重置验证码的邮件内容。邮件不包含卡组、卡片和复习记录。' },
        { label: '运营基础设施', text: '计划将账号和学习数据库保存在韩国境内自行运营的服务器中，尚未选择外部托管商。如使用外部服务，将确认并说明受托方、工作范围、转委托和保存条件。' },
      ], links: [{ label: 'Google隐私政策', href: 'https://policies.google.com/privacy?hl=zh-CN' }] },
      { id: 'overseas', title: '境外处理', paragraphs: [
        'Google登录和Gmail发送使用境外服务商系统。Google说明信息可能在多个国家处理。Google从设备直接收集信息，与Remory为发送邮件而传递信息，是不同的数据流。',
        '构成境外传输时的接收法人及联系方式、国家、信息项目、时间和方式、目的、保存期、法律依据及拒绝方法和影响，须依据实际合同和路径确认。确认前，不将本文用作已完成境外传输告知的正式政策。',
        '不选择Google登录也可以使用邮箱注册和登录，但当前登录页面也加载Google组件。不接收认证邮件则无法使用邮箱验证码重置密码。',
      ] },
      { id: 'storage', title: 'Cookie和设备存储', paragraphs: [
        'remory_refresh使用HttpOnly、SameSite=Lax，在HTTPS下启用Secure。浏览器保存期为400天，每次刷新续期，浏览器也可能提前删除。remory_google_browser设置为1小时。',
        '设备可能保存访客学习内容、主题和语言、展示用账号邮箱/ID/关联状态、跨标签登录变更通知及未完成退出标记。访问令牌仅在内存使用，旧登录存储信息在迁移时清理。应用页面文件和图片可能被缓存。',
        '可在浏览器中阻止Cookie或清除网站数据。阻止可能限制登录和刷新。清除设备数据或卸载应用可能丢失访客记录；服务器中保存的账号记录可再次登录读取。',
      ] },
      { id: 'deletion', title: '删除和销毁', paragraphs: [
        '账号注销成功后，删除运营数据库中的账号、密码哈希、Google关联、登录权限、卡组、卡片、复习记录及账号关联的旧学习资料。通过删除电子记录处理，并撤销登录权限。',
        '退出登录不会删除账号学习记录。注销不会删除未导入而单独保留在设备的访客记录，也不会删除Google账号本身。设备记录可通过该设备的网站/应用数据管理另行清除。',
        '外部邮件、日志和独立备份的残留资料应与运营数据库区分，另行确定保存和删除条件。如依法需要保留资料，将具体说明依据、项目、期限和分离保管方式。',
      ] },
      { id: 'rights', title: '用户及法定代理人的权利', paragraphs: [
        '用户及合法代理人可按适用法律申请查阅、更正、删除、停止处理和撤回同意。仅在处理请求所需范围内核验身份或代理权限。',
        '可在应用中查看、修改和删除卡组、卡片。注销账号可在设置中或以下公开网页验证身份后进行。更正邮箱等未提供直接操作的请求，请联系隐私负责人。',
      ], links: [
        { label: '通过网页注销账号', href: '/account-deletion/' },
        { label: '个人信息侵害举报中心', href: 'https://privacy.kisa.or.kr/' },
        { label: '个人信息争议调解委员会', href: 'https://www.kopico.go.kr/' },
      ] },
      { id: 'security', title: '安全保护措施', paragraphs: [
        '密码使用单向哈希，认证和重置权限保存哈希而非原始值。实施账号权限检查、一次性认证、请求限制和权限撤销。',
        '正式运营时将确认加密通信、运营访问权限、日志管理、备份保护等部署措施。本草案不声称实施了未经确认的全盘加密或外部安全认证。',
      ] },
      { id: 'children', title: '儿童个人信息', paragraphs: [
        '未满14周岁用户的服务范围、监护人同意和权利行使程序将在正式公开前确定。本草案不表示目前已实施年龄验证或监护人同意程序。',
      ] },
      { id: 'changes', title: '政策变更', paragraphs: [
        '本文以当前功能为依据，运营事项确认后再标示正式生效日。如收集项目、目的、外部服务或保存方式变化，将在本页公布变更和适用日期，需要另行通知或同意时执行相应程序。翻译仅用于帮助理解，韩文为参考原文。',
      ] },
    ],
  },
};
