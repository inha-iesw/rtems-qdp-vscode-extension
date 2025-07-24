(function() {
    const vscode = acquireVsCodeApi();
    
    let currentConfig = {};
    let buildSteps = {};
    let categories = {};
    let presets = []; // 빈 배열로 초기화

    // DOM 요소들
    let targetArchitectureInput, targetBSPInput, isSMPCheckbox;
    let buildDirectoryInput, platformDescriptionInput, platformNameInput;
    let presetSelect, loadPresetBtn, savePresetBtn, deletePresetBtn;
    let savePresetModal, presetNameInput, presetDescriptionInput;
    let confirmSavePresetBtn, cancelSavePresetBtn;
    let deletePresetModal, deletePresetMessage, confirmDeletePresetBtn, cancelDeletePresetBtn;
    let buildStepsContainer;
    let generateConfigBtn, buildBtn, checkEnvBtn;
    let statusMessage, envStatus;

    // 초기화
    document.addEventListener('DOMContentLoaded', function() {
        initializeElements();
        bindEvents();
        requestInitialData();
    });

    function initializeElements() {
        targetArchitectureInput = document.getElementById('targetArchitecture');
        targetBSPInput = document.getElementById('targetBSP');
        isSMPCheckbox = document.getElementById('isSMP');
        buildDirectoryInput = document.getElementById('buildDirectory');
        platformDescriptionInput = document.getElementById('platformDescription');
        platformNameInput = document.getElementById('platformName');
        presetSelect = document.getElementById('presetSelect');
        loadPresetBtn = document.getElementById('loadPresetBtn');
        savePresetBtn = document.getElementById('savePresetBtn');
        deletePresetBtn = document.getElementById('deletePresetBtn');
        savePresetModal = document.getElementById('savePresetModal');
        presetNameInput = document.getElementById('presetName');
        presetDescriptionInput = document.getElementById('presetDescription');
        confirmSavePresetBtn = document.getElementById('confirmSavePreset');
        cancelSavePresetBtn = document.getElementById('cancelSavePreset');
        deletePresetModal = document.getElementById('deletePresetModal');
        deletePresetMessage = document.getElementById('deletePresetMessage');
        confirmDeletePresetBtn = document.getElementById('confirmDeletePreset');
        cancelDeletePresetBtn = document.getElementById('cancelDeletePreset');
        buildStepsContainer = document.getElementById('buildStepsContainer');
        generateConfigBtn = document.getElementById('generateConfigBtn');
        buildBtn = document.getElementById('buildBtn');
        checkEnvBtn = document.getElementById('checkEnvBtn');
        statusMessage = document.getElementById('statusMessage');
        envStatus = document.getElementById('envStatus');
    }

    function bindEvents() {
        [targetArchitectureInput, targetBSPInput, isSMPCheckbox].forEach(input => {
            input.addEventListener('change', updateConfigFromInputs);
        });

        // 입력 필드 변경 이벤트
        [buildDirectoryInput, platformDescriptionInput, platformNameInput].forEach(input => {
            input.addEventListener('change', updateConfigFromInputs);
        });

        // 프리셋 관련 버튼 이벤트
        loadPresetBtn.addEventListener('click', loadPreset);
        savePresetBtn.addEventListener('click', showSavePresetModal);
        deletePresetBtn.addEventListener('click', showDeletePresetModal);
        confirmSavePresetBtn.addEventListener('click', savePreset);
        cancelSavePresetBtn.addEventListener('click', hideSavePresetModal);
        confirmDeletePresetBtn.addEventListener('click', confirmDeletePreset);
        cancelDeletePresetBtn.addEventListener('click', hideDeletePresetModal);

        // 모달 바깥 클릭 시 닫기
        savePresetModal.addEventListener('click', (e) => {
            if (e.target === savePresetModal) {
                hideSavePresetModal();
            }
        });

        deletePresetModal.addEventListener('click', (e) => {
            if (e.target === deletePresetModal) {
                hideDeletePresetModal();
            }
        });

        // Enter 키로 저장
        presetNameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                savePreset();
            }
        });

        presetDescriptionInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                savePreset();
            }
        });

        // Escape 키로 모달 닫기
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideSavePresetModal();
                hideDeletePresetModal();
            }
        });

        // 기타 버튼 이벤트
        generateConfigBtn.addEventListener('click', generateConfig);
        buildBtn.addEventListener('click', executeBuild);
        checkEnvBtn.addEventListener('click', checkEnvironment);
    }

    function requestInitialData() {
        vscode.postMessage({ type: 'getConfig' });
        vscode.postMessage({ type: 'getBuildSteps' });
        vscode.postMessage({ type: 'getPresets' });
    }

    function updateConfigFromInputs() {
        currentConfig = {
            ...currentConfig,
            targetArchitecture: targetArchitectureInput.value.trim(),
            targetBSP: targetBSPInput.value.trim(),
            isSMP: isSMPCheckbox.checked,
            buildDirectory: buildDirectoryInput.value,
            platform: {
                description: platformDescriptionInput.value,
                name: platformNameInput.value
            }
        };

        vscode.postMessage({
            type: 'updateConfig',
            config: currentConfig
        });
    }

    function updateBuildStepsFromCheckboxes() {
        const checkboxes = buildStepsContainer.querySelectorAll('input[type=\"checkbox\"]:checked');
        const selectedSteps = Array.from(checkboxes).map(cb => cb.value);
        
        currentConfig.selectedSteps = selectedSteps;
        vscode.postMessage({
            type: 'updateConfig',
            config: { selectedSteps }
        });
    }

    function loadPreset() {
        const selectedPreset = presetSelect.value;
        if (selectedPreset) {
            vscode.postMessage({
                type: 'loadPreset',
                presetName: selectedPreset
            });
            showStatus('프리셋을 로드 중...', 'info');
        }
    }

    function showSavePresetModal() {
        presetNameInput.value = '';
        presetDescriptionInput.value = '';
        savePresetModal.style.display = 'flex';
        presetNameInput.focus();
    }

    function hideSavePresetModal() {
        savePresetModal.style.display = 'none';
    }

    function showDeletePresetModal() {
        const selectedPreset = presetSelect.value;
        if (!selectedPreset) {
            showStatus('삭제할 프리셋을 선택해주세요.', 'error');
            return;
        }

        // 기본 프리셋은 삭제할 수 없음
        if (['default', 'minimal', 'full'].includes(selectedPreset)) {
            showStatus('기본 프리셋은 삭제할 수 없습니다.', 'error');
            return;
        }

        deletePresetMessage.textContent = `프리셋 "${selectedPreset}"을(를) 삭제하시겠습니까?`;
        deletePresetModal.style.display = 'flex';
    }

    function hideDeletePresetModal() {
        deletePresetModal.style.display = 'none';
    }

    function confirmDeletePreset() {
        const selectedPreset = presetSelect.value;
        if (selectedPreset) {
            vscode.postMessage({
                type: 'deletePreset',
                presetName: selectedPreset
            });
            showStatus('프리셋을 삭제 중...', 'info');
        }
        hideDeletePresetModal();
    }

    function savePreset() {
        const name = presetNameInput.value.trim();
        const description = presetDescriptionInput.value.trim();

        if (!name) {
            showStatus('프리셋 이름을 입력해주세요.', 'error');
            return;
        }

        vscode.postMessage({
            type: 'savePreset',
            presetName: name,
            presetDescription: description
        });

        hideSavePresetModal();
        showStatus('프리셋을 저장 중...', 'info');
    }

    function generateConfig() {
        vscode.postMessage({ type: 'generateConfig' });
        showStatus('설정 파일을 생성 중...', 'info');
    }

    function executeBuild() {
        vscode.postMessage({ type: 'build' });
        showStatus('빌드를 실행 중...', 'info');
    }

    function checkEnvironment() {
        vscode.postMessage({
            type: 'checkEnvironment',
            config: { currentConfig }
        });
        showStatus('환경을 확인 중...', 'info');
    }

    function showStatus(message, type = 'info') {
        statusMessage.textContent = message;
        statusMessage.className = `status-message ${type}`;
        
        if (type === 'success' || type === 'error') {
            setTimeout(() => {
                statusMessage.textContent = '';
                statusMessage.className = 'status-message';
            }, 5000);
        }
    }

    function showEnvStatus(isValid, issues = []) {
        if (isValid) {
            envStatus.innerHTML = '<span class=\"status-ok\">✅ 환경이 올바르게 설정되었습니다.</span>';
        } else {
            const issueList = issues.map(issue => `<li>${issue}</li>`).join('');
            envStatus.innerHTML = `
                <div class="status-error">
                    ❌ 환경 설정에 문제가 있습니다:
                    <ul>${issueList}</ul>
                </div>
            `;
        }
    }

    function renderBuildSteps() {
        if (!buildSteps || Object.keys(buildSteps).length === 0) {
            return;
        }

        buildStepsContainer.innerHTML = '';

        // 카테고리별로 그룹화
        const stepsByCategory = {};
        Object.values(buildSteps).forEach(step => {
            if (!stepsByCategory[step.category]) {
                stepsByCategory[step.category] = [];
            }
            stepsByCategory[step.category].push(step);
        });

        // 카테고리별로 렌더링
        Object.keys(stepsByCategory).sort().forEach(categoryKey => {
            const categoryInfo = categories[categoryKey] || { name: categoryKey, description: '' };
            const steps = stepsByCategory[categoryKey];

            const categoryDiv = document.createElement('div');
            categoryDiv.className = 'category-group';
            
            const categoryHeader = document.createElement('h3');
            const categoryTitle = categoryInfo.icon ? 
                `${categoryInfo.icon} ${categoryInfo.name}` : 
                categoryInfo.name;
            categoryHeader.textContent = categoryTitle;
            categoryHeader.title = categoryInfo.description;
            categoryDiv.appendChild(categoryHeader);

            const stepsDiv = document.createElement('div');
            stepsDiv.className = 'steps-group';

            steps.forEach(step => {
                const stepDiv = document.createElement('div');
                stepDiv.className = 'step-item';

                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.id = step.uid;
                checkbox.value = step.uid;
                checkbox.checked = currentConfig.selectedSteps && currentConfig.selectedSteps.includes(step.uid);
                checkbox.addEventListener('change', updateBuildStepsFromCheckboxes);

                const label = document.createElement('label');
                label.htmlFor = step.uid;
                
                // 단계 이름과 설명
                const nameSpan = document.createElement('span');
                nameSpan.className = 'step-name';
                nameSpan.textContent = step.name;
                
                const descSpan = document.createElement('span');
                descSpan.className = 'step-description';
                descSpan.textContent = step.description;

                // 추가 정보 (예상 시간, 태그 등)
                const infoDiv = document.createElement('div');
                infoDiv.className = 'step-info';
                
                if (step.estimated_time) {
                    const timeSpan = document.createElement('span');
                    timeSpan.className = 'step-time';
                    timeSpan.textContent = `⏱️ ${step.estimated_time}`;
                    infoDiv.appendChild(timeSpan);
                }
                
                if (step.tags && step.tags.length > 0) {
                    const tagsSpan = document.createElement('span');
                    tagsSpan.className = 'step-tags';
                    tagsSpan.textContent = `🏷️ ${step.tags.join(', ')}`;
                    infoDiv.appendChild(tagsSpan);
                }

                if (step.dependencies && step.dependencies.length > 0) {
                    const depsSpan = document.createElement('span');
                    depsSpan.className = 'step-dependencies';
                    depsSpan.textContent = `📋 Depends: ${step.dependencies.length} steps`;
                    depsSpan.title = step.dependencies.join(', ');
                    infoDiv.appendChild(depsSpan);
                }

                label.appendChild(nameSpan);
                label.appendChild(descSpan);
                if (infoDiv.children.length > 0) {
                    label.appendChild(infoDiv);
                }

                stepDiv.appendChild(checkbox);
                stepDiv.appendChild(label);
                stepsDiv.appendChild(stepDiv);
            });

            categoryDiv.appendChild(stepsDiv);
            buildStepsContainer.appendChild(categoryDiv);
        });
    }

    function renderPresets() {
        presetSelect.innerHTML = '<option value=\"\">프리셋 선택...</option>';
        presets.forEach(preset => {
            const option = document.createElement('option');
            option.value = preset;
            option.textContent = preset;
            presetSelect.appendChild(option);
        });
    }

    function updateInputsFromConfig() {
        if (currentConfig) {
            targetArchitectureInput.value = currentConfig.targetArchitecture || '';
            targetBSPInput.value = currentConfig.targetBSP || '';
            isSMPCheckbox.checked = currentConfig.isSMP || true;
            buildDirectoryInput.value = currentConfig.buildDirectory || '';
            platformDescriptionInput.value = currentConfig.platform?.description || '';
            platformNameInput.value = currentConfig.platform?.name || '';
        }
    }

    // VS Code 메시지 리스너
    window.addEventListener('message', event => {
        const message = event.data;

        switch (message.type) {
            case 'config':
                currentConfig = message.config;
                updateInputsFromConfig();
                renderBuildSteps(); // 설정이 업데이트되면 빌드 스텝도 다시 렌더링
                break;

            case 'buildSteps':
                buildSteps = message.buildSteps;
                categories = message.categories;
                renderBuildSteps();
                break;

            case 'presets':
                presets = message.presets;
                renderPresets();
                break;

            case 'configGenerated':
                if (message.success) {
                    showStatus(`설정 파일이 생성되었습니다: ${message.path}.`, 'success');
                } else {
                    showStatus(`설정 파일 생성 실패: ${message.error}`, 'error');
                }
                break;

            case 'buildCompleted':
                if (message.success) {
                    showStatus('빌드가 완료되었습니다.', 'success');
                } else {
                    showStatus(`빌드 실패: ${message.error}`, 'error');
                }
                break;

            case 'environmentCheck':
                showEnvStatus(message.isValid, message.issues);
                break;

            case 'success':
                showStatus(message.message, 'success');
                break;

            case 'error':
                showStatus(message.message, 'error');
                break;

            case 'presetSaved':
                if (message.success) {
                    showStatus('프리셋이 저장되었습니다.', 'success');
                    // 프리셋 목록 새로고침
                    vscode.postMessage({ type: 'getPresets' });
                } else {
                    showStatus(`프리셋 저장 실패: ${message.error}`, 'error');
                }
                break;

            case 'presetDeleted':
                if (message.success) {
                    showStatus('프리셋이 삭제되었습니다.', 'success');
                    // 프리셋 목록 새로고침 및 선택 초기화
                    presetSelect.value = '';
                    vscode.postMessage({ type: 'getPresets' });
                } else {
                    showStatus(`프리셋 삭제 실패: ${message.error}`, 'error');
                }
                break;
        }
    });
})();