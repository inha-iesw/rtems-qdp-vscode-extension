# RTEMS QDP Builder VSCode Extension

RTEMS QDP 빌드 과정을 자동화하는 VSCode Extension입니다. 복잡한 YAML 설정 파일을 사용자 친화적인 UI로 생성하고 빌드를 실행할 수 있습니다.

## 🚀 주요 기능

- **사용자 친화적 UI**: 복잡한 YAML 설정을 GUI로 간편하게 구성
- **초간단 설정**: 정말 필요한 3개 필드만 입력하면 완료
- **스마트 프리셋 시스템**: 기본 프리셋 + 사용자 정의 프리셋 저장/관리
- **빌드 스텝 선택**: 40여 개의 빌드 스텝을 카테고리별로 체크박스로 선택
- **자동 빌드 실행**: 설정 생성부터 빌드 실행까지 원클릭으로 처리
- **환경 검증**: 빌드 환경이 올바르게 설정되었는지 자동 확인

## 📁 프로젝트 구조

```
rtems-qdp-builder/
├── package.json                    # Extension 설정
├── src/
│   ├── extension.ts                # 메인 Extension 파일
│   ├── webview/
│   │   └── webviewProvider.ts      # 웹뷰 프로바이더
│   ├── config/
│   │   ├── configManager.ts        # 설정 관리자
│   │   ├── yamlGenerator.ts        # YAML 생성기
│   │   └── buildStepManager.ts     # 빌드 스텝 관리자
│   ├── build/
│   │   └── buildExecutor.ts        # 빌드 실행기
│   └── utils/
│       └── fileUtils.ts            # 파일 유틸리티
├── media/
│   ├── main.js                     # 웹뷰 JavaScript
│   └── main.css                    # 웹뷰 CSS
├── config/
│   └── package-build.yml           # 빌드 스텝 메타데이터 및 설정
└── presets/
    ├── default.yml                 # 기본 프리셋
    ├── minimal.yml                 # 최소 프리셋
    └── full.yml                    # 전체 프리셋
```

## 🛠️ 설치 및 사용법

### 1. 설치

```bash
# Node.js 20.18.1 이상 버전 필요
# 의존성 설치
npm install

# TypeScript 컴파일
npm run compile
```

### 2. 개발 모드 실행

VSCode에서 `F5`를 눌러 새로운 Extension Development Host 창을 열고 테스트할 수 있습니다.

### 3. 사용 방법

1. **Extension 활성화**: `Ctrl+Shift+P`를 눌러 "Open RTEMS QDP Builder" 명령어를 실행
2. **환경 확인**: "환경 확인" 버튼을 클릭하여 빌드 환경이 올바른지 검증
3. **설정 구성**: 
   - **빌드 디렉터리**: 생성될 빌드 디렉터리 이름 입력
   - **플랫폼 설정**: 테스트 플랫폼 설명과 이름 입력
   - 프리셋을 선택하거나 개별 빌드 스텝을 체크박스로 선택
4. **설정 파일 생성**: "설정 파일 생성" 버튼을 클릭하여 YAML 파일 생성
5. **빌드 실행**: "빌드 실행" 버튼을 클릭하여 자동으로 빌드 수행

## 🚀 배포

### 1. 패키징
```bash
# Node.js 20.18.1 이상 버전 필요
# 의존성 설치
npm install
# Extension을 VSIX로 패키징
npm install -g @vscode/vsce
vsce package
```

## 2. 설치

패키징해서 생성된 `.vsix` 파일을 `devcontainer`에 설치합니다.
```bash
# devcontainer 내부에서:
code --install-extension rtems-qdp-builder-1.0.0.vsix
```

또는 `devcontainer` 구성 시 extension을 자동으로 설치하도록 설정할 수 있습니다.
```json
{
  "name": "RTEMS QDP Development",
  "dockerFile": "../QDP.Dockerfile",
  "workspaceFolder": "/workspace",
  "mounts": [
    "source=${localWorkspaceFolder},target=/workspace,type=bind",
    // extension 소스를 마운트
    "source=${localWorkspaceFolder}/rtems-qdp-builder-src,target=/extension,type=bind"
  ],
  "privileged": true,
  "customizations": {
    "vscode": {
      "extensions": [
        // extension 명시
        "rtems-qdp-builder-1.0.0.vsix"
      ],
    }
  },
}
```

## 📋 빌드 스텝 카테고리

### 📦 Repository
- ESA 메인 저장소 클론
- RTEMS Source Builder 클론
- RTEMS 소스 코드 클론
- RTEMS 문서 클론
- RTEMS 도구 클론

### 🔧 Setup
- RTEMS Source Builder 실행
- 빌드 환경 설정

### 🏗️ Core Build
- BSP(Board Support Package) 빌드
- BSP 커버리지 분석 빌드
- BSP 정적 분석 도구 빌드

### ✅ Qualification
- 자격 검증 전용 빌드
- BSP Qualification 빌드
- BSP Qual 커버리지 빌드
- BSP Qual 정적 분석 빌드

### 🧪 Test Execution
- 로컬 타겟 테스트 실행
- 로컬 보드 타겟 테스트
- ESA 플랫폼 테스트
- 각종 커버리지 테스트

### 📚 Documentation
- DDF SDD(Software Design Document)
- DDF SRELD
- TS-SRS, TS-ICD
- RTEMS 공식 문서

### 🔍 Verification
- DJF-SVS (Verification Specification)
- DJF-SUITP (Integration Test Procedures)
- DJF-SVR (Verification Report)
- DJF-SRF (Software Release File)

### 📝 Technical Notes
- TN-TI (Tool Installation)
- TN-QT (Qualification Tools)
- TN-SP (Software Platform)

### 📋 Management
- MGT-SCMP (Configuration Management)
- MGT-SDP (Development Plan)
- MGT-SREVP (Review & Evaluation)

### 🛡️ Process Assurance
- PAF-SPAP (Process Assurance Plan)
- PAF-SPAMR (Monitoring Report)

### 🔬 Formal Methods
- FM-FVP (Formal Verification Plan)
- FM-FVA (Verification Activities)
- FM-FVR (Verification Report)

### 🔒 ISVV
- Independent Software Verification & Validation

### 🛠️ Tools
- Issue Retriever
- Qualification 도구 복사

### 💡 Examples
- C/C++ 예제 코드 복사

### 📤 Package
- 아카이브 생성
- 패키지 매뉴얼 빌드

## 🎯 프리셋 시스템

### 📋 기본 프리셋

#### 기본 빌드 (default)
표준적인 RTEMS QDP 빌드에 필요한 필수 스텝들:
- BSP 빌드 (기본, Qual-only, 커버리지 포함)
- 로컬 타겟 테스트 실행
- DDF SDD 빌드
- DJF SVR 빌드

#### 최소 빌드 (minimal)
가장 기본적인 구성 요소만 포함:
- BSP 빌드
- BSP Qual-only 빌드

#### 전체 빌드 (full)
모든 가능한 빌드 스텝을 포함한 완전한 빌드

### 👤 사용자 정의 프리셋

#### 프리셋 저장
1. 원하는 빌드 스텝들을 체크박스로 선택
2. 빌드 디렉터리와 플랫폼 설정 구성
3. **"프리셋 저장"** 버튼 클릭
4. 프리셋 이름과 설명(선택사항) 입력
5. **"저장"** 버튼으로 완료

#### 프리셋 관리
- **로드**: 프리셋 선택 후 "프리셋 로드" 버튼
- **삭제**: 사용자 정의 프리셋 선택 후 "프리셋 삭제" 버튼 (기본 프리셋은 삭제 불가)
- **구분 표시**: 드롭다운에서 기본 프리셋과 사용자 프리셋(👤 아이콘)이 구분됨

#### 저장되는 정보
- 선택된 빌드 스텝 목록
- 빌드 디렉터리 설정
- 플랫폼 정보 (설명, 이름)
- 생성 시간

## 🔧 빌드 명령어

Extension은 내부적으로 다음 명령어를 순차적으로 실행합니다:

```bash
# 1. 설정 실행 (qual-tool 디렉터리에서)
python3 qdp_config.py sparc-gr740-smp-user-qual.yml

# 2. 빌드 실행 (qual-tool 디렉터리에서)
python3 qdp_build.py --log-level=INFO build-sparc-gr740-smp-user-qual/ 2>&1 | tee qdp_build_log.txt
```

## 📁 요구되는 환경 구조

Extension은 다음과 같은 RTEMS QDP 환경 구조에서 작동합니다:

```
/opt/                           # ← VSCode 워크스페이스 루트
├── rtems-6-sparc-gr740-smp-5/
│   ├── bin/
│   │   ├── rtems-test          # 테스트 실행 바이너리
│   │   ├── rtems-run
│   │   ├── sparc-rtems6-sis
│   │   └── ...
│   ├── doc/
│   ├── include/
│   ├── qual-tool/
│   │   ├── BUILD_DIRECTORY/
│   │   ├── config/
│   │   ├── config-variants/
│   │   │   └── USER_CONFIG.yml
│   │   ├── docs/
│   │   ├── qdp_config.py       # QDP 설정 스크립트
│   │   ├── qdp_build.py        # QDP 빌드 스크립트
│   │   └── [생성된-설정].yml   # Extension이 생성하는 YAML 파일
│   └── ...
└── [기타 시스템 디렉터리들...]
```

**중요**: VSCode 워크스페이스는 `/opt` 디렉터리에서 열어야 합니다.

## 🔍 생성되는 YAML 파일 예시

```yaml
build-directory: build-sparc-gr740-smp-user-qual
post-process-items:
  - uid: /steps/build-djf-svr
    path: /test-log-files
    action: set
    value:
      - platform-description: "User Hardware Execution"
        platform-name: board
        standard-log: ${../variant:/build-directory}/test-reports/log-run-rtems-qual-only-board.yaml
        coverage-log: ${../variant:/build-directory}/test-reports/log-run-rtems-qual-only-board-cov.yaml
  - uid: /dirs/djf-svr-deploy/dir
    path: /directory
    action: set
    value: /opt/rtems-6-sparc-gr740-smp-5/user_doc/djf/svr
  - uid: /steps/run-local-target-qual-only
    path: /commands
    action: set
    value:
      - - "/opt/rtems-6-sparc-gr740-smp-5/bin/rtems-test"
        - "--user-config=${.:config-directory}/${.:config-file}"
        - "--rtems-bsp=${.:config-variant}"
        - "."
        - "--log-mode=all"
        - "--jobs=1"
        - "--timeout=7200"
        - "--report-format=yaml"
        - "--report-path=${.:executables-directory}/log-run-rtems-qual-only-board"
  - uid: /package-build
    path: /links
    action: set
    value:
      - role: build-step
        uid: steps/build-bsp
      - role: build-step
        uid: steps/build-bsp-qual-only
      # ... 선택된 빌드 스텝들
spec-paths:
  - spec-spec
  - spec-glossary
  - config
```

**참고**: 실제 RTEMS 디렉터리 경로는 워크스페이스에서 자동으로 탐지됩니다.

## 🎨 커스터마이징

### 새로운 기본 프리셋 추가

`presets/` 디렉터리에 새로운 YAML 파일을 추가:

```yaml
# presets/custom.yml
name: "커스텀 빌드"
description: "사용자 정의 빌드 구성"
steps:
  - steps/build-bsp
  - steps/custom-step
```

### 사용자 정의 프리셋

Extension UI에서 직접 프리셋을 저장하고 관리할 수 있습니다:
- 현재 설정을 프리셋으로 저장
- 저장된 프리셋을 언제든지 로드
- 불필요한 프리셋 삭제
- 프리셋별 설명 추가 가능

### 빌드 스텝 메타데이터 수정

`config/package-build.yml` 파일에서 빌드 스텝 설명, 카테고리, 예상 시간, 의존성 등을 수정할 수 있습니다.

## 🤝 기여하기

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### 커밋 메시지
- 🎉: Begin a project.
- ✨: Introduce new features.
- ⚡️: Improve performance.
- 🎨: Improve / Refactor the structure or format of the code.
- 🐛: Fix a bug.
- ✏️: Fix typos.
- 📝: Add or Update the documentation / comments.
- 🔥: Remove code or files.
- 🚀: Deploy stuff.

## 📄 라이선스

This project is licensed under the Apache 2.0 License

## 🆘 문제 해결

### 일반적인 문제들

**Q: RTEMS 설치 디렉터리를 찾을 수 없다고 나옵니다.**

A: 워크 스페이스 디렉터리에 `rtems-6-` 로 시작하는 디렉터리가 있는지 확인하고, 타깃 아키텍처와 BSP를 맞게 설정했는지 확인해주세요.

**Q: qdp_config.py 파일이 없다고 나옵니다.**

A: `rtems-6-*/qual-tool/` 디렉터리에 `qdp_config.py`와 `qdp_build.py` 파일이 있는지 확인하세요.

**Q: RTEMS 바이너리가 없다고 나옵니다.**

A: RTEMS 설치 구조를 확인하세요. `rtems-6-*/bin/rtems-test` 파일이 있어야 합니다.

**Q: 빌드가 실패합니다.**

A: Output 창(RTEMS QDP Builder)에서 자세한 오류 메시지를 확인하고, RTEMS 설치 구조와 Python 환경이 올바르게 설정되었는지 확인하세요.

**Q: qual-tool 디렉터리가 없다고 나옵니다.**

A: RTEMS QDP 설치가 완전한지 확인하세요. QDP 도구가 제대로 설치되어 있어야 합니다.

**Q: 프리셋이 저장되지 않습니다.**

A: 워크스페이스 설정에 쓰기 권한이 있는지 확인하고, 프리셋 이름이 유효한지 확인하세요.

**Q: 저장한 프리셋이 목록에 나타나지 않습니다.**

A: 워크스페이스를 다시 열거나 Extension을 재시작해보세요. 프리셋은 workspace settings에 저장됩니다.

**Q: 기본 프리셋을 삭제하려고 하는데 오류가 납니다.**

A: 기본 프리셋(default, minimal, full)은 삭제할 수 없습니다. 사용자 정의 프리셋만 삭제 가능합니다.

## 📞 지원

문제가 발생하거나 기능 요청이 있으시면 GitHub Issues를 통해 문의해주세요.